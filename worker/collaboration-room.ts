import { DurableObject } from 'cloudflare:workers';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../db';
import { sessions } from '../db/schema';
import { assertSameOrigin, AuthError, json, requireSession } from '../lib/auth/server';
import { leaveReview, memberRoom, roomData, sendMessage, transition } from '../lib/endorse/collaborations';
import { reviewWindow } from '../lib/endorse/collaboration-validation';
import { marketplaceFailure } from '../lib/endorse/marketplace';

type Connection = { roomId: string; userId: string; sessionId: string; expiresAt: number; cursor: number; rateStart: number; rateCount: number };
const packetSchema = z.object({
  type: z.literal('command'), id: z.string().uuid(),
  kind: z.enum(['message', 'action', 'review']), payload: z.unknown(),
});

export class CollaborationRoom extends DurableObject<Cloudflare.Env> {
  private queue: Promise<unknown> = Promise.resolve();

  // Serialize commands and broadcasts in the room, including legacy HTTP notifications.
  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation);
    this.queue = result.catch(() => {});
    return result;
  }

  async fetch(request: Request): Promise<Response> {
    return this.serial(async () => {
      try {
        const url = new URL(request.url);
        const notification = url.pathname.match(/^\/notify\/([0-9a-f-]{36})$/i);
        if (notification && request.method === 'POST' && url.hostname === 'collaboration.internal') {
          this.assertRoom(notification[1]);
          await this.broadcast();
          return new Response(null, { status: 204 });
        }
        const match = url.pathname.match(/^\/api\/collaborations\/([0-9a-f-]{36})\/socket$/i);
        if (!match || request.method !== 'GET' || request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'Not found.' }, 404);
        this.assertRoom(match[1]);
        assertSameOrigin(request);
        const session = await requireSession(request.headers);
        await memberRoom(match[1], session.user.id);
        const [stored] = await getDb().select({ expiresAt: sessions.expiresAt }).from(sessions).where(eq(sessions.id, session.sessionId)).limit(1);
        if (!stored) throw new AuthError(401, 'Please log in again.');
        if (this.ctx.getWebSockets(session.user.id).length >= 8) throw new AuthError(429, 'Too many open tabs for this collaboration. Close a tab and retry.');
        const cursor = Number(url.searchParams.get('after'));
        const pair = new WebSocketPair();
        const connection: Connection = {
          roomId: match[1], userId: session.user.id, sessionId: session.sessionId, expiresAt: stored.expiresAt,
          cursor: Number.isSafeInteger(cursor) && cursor > 0 ? cursor : 0, rateStart: Date.now(), rateCount: 0,
        };
        this.ctx.acceptWebSocket(pair[1], [session.user.id]);
        pair[1].serializeAttachment(connection);
        // Client requests its first snapshot after open, so no data is sent before the upgrade finishes.
        await this.schedule();
        return new Response(null, { status: 101, webSocket: pair[0] });
      } catch (error) { return marketplaceFailure(error); }
    });
  }

  private assertRoom(id: string) {
    if (!this.env.COLLABORATION_ROOMS || !this.ctx.id.equals(this.env.COLLABORATION_ROOMS.idFromName(id))) throw new AuthError(404, 'Collaboration not found.');
  }

  private async authorize(socket: WebSocket): Promise<Connection> {
    const connection = socket.deserializeAttachment() as Connection | null;
    if (!connection || connection.expiresAt <= Math.floor(Date.now() / 1000)) throw new AuthError(401, 'Your session expired. Please log in again.');
    const [session] = await getDb().select({ id: sessions.id }).from(sessions).where(and(
      eq(sessions.id, connection.sessionId), eq(sessions.userId, connection.userId), gt(sessions.expiresAt, Math.floor(Date.now() / 1000)),
    )).limit(1);
    if (!session) throw new AuthError(401, 'You have been logged out. Please log in again.');
    await memberRoom(connection.roomId, connection.userId);
    return connection;
  }

  private async snapshot(socket: WebSocket) {
    const connection = await this.authorize(socket);
    // Pages keep packets bounded. A reconnect uses the client's last received cursor.
    for (let page = 0; page < 20; page++) {
      const data = await roomData(connection.roomId, connection.userId, undefined, connection.cursor || undefined);
      socket.send(JSON.stringify({ type: 'state', data }));
      if (data.messages.length) connection.cursor = Math.max(connection.cursor, data.messages.at(-1)!.id);
      socket.serializeAttachment(connection);
      if (!data.hasNewer) return;
    }
    socket.send(JSON.stringify({ type: 'catchup' }));
  }

  private fail(socket: WebSocket, error: unknown, id?: string) {
    const status = error instanceof AuthError ? error.status : 503;
    const message = error instanceof AuthError ? error.message : 'Unable to update this collaboration. Please try again.';
    try {
      socket.send(JSON.stringify({ type: 'error', id, status, error: message }));
      if (status === 401 || status === 404) socket.close(status === 401 ? 4401 : 4403, 'Access ended');
      else if (!id && status === 503) socket.close(1011, 'Please reconnect');
    } catch { /* The client already disconnected. */ }
    if (status === 503) console.error('Live collaboration operation failed.');
  }

  private async broadcast() {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket.readyState !== WebSocket.OPEN) continue;
      try { await this.snapshot(socket); } catch (error) { this.fail(socket, error); }
    }
    await this.schedule();
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer) {
    return this.serial(async () => {
      let id: string | undefined;
      try {
        if (typeof message !== 'string' || new TextEncoder().encode(message).length > 65536) {
          socket.close(1009, 'Message is too large'); return;
        }
        const connection = await this.authorize(socket);
        if (Date.now() - connection.rateStart > 10000) { connection.rateStart = Date.now(); connection.rateCount = 0; }
        if (++connection.rateCount > 40) { socket.close(1008, 'Too many requests'); return; }
        socket.serializeAttachment(connection);
        let packet;
        try { packet = JSON.parse(message); } catch { throw new AuthError(400, 'Invalid message.'); }
        if (packet?.type === 'ping') { socket.send(JSON.stringify({ type: 'pong' })); return; }
        if (packet?.type === 'sync') { await this.snapshot(socket); await this.schedule(); return; }
        const parsed = packetSchema.safeParse(packet);
        if (!parsed.success) throw new AuthError(400, 'Invalid collaboration command.');
        id = parsed.data.id;
        const { kind, payload } = parsed.data;
        if (kind === 'message') await sendMessage(connection.roomId, connection.userId, payload);
        else if (kind === 'action') await transition(connection.roomId, connection.userId, payload);
        else await leaveReview(connection.roomId, connection.userId, payload);
        // Acknowledge only committed writes. Each viewer receives their own filtered snapshot.
        socket.send(JSON.stringify({ type: 'ack', id }));
        await this.broadcast();
      } catch (error) {
        this.fail(socket, error, id);
        if (error instanceof AuthError && error.status === 409) {
          try { await this.snapshot(socket); } catch (problem) { this.fail(socket, problem); }
        }
      }
    });
  }

  private async schedule() {
    const active = this.ctx.getWebSockets().filter(socket => socket.readyState === WebSocket.OPEN);
    if (!active.length) { await this.ctx.storage.deleteAlarm(); return; }
    const connections = active.map(socket => socket.deserializeAttachment() as Connection);
    let next = Math.min(...connections.map(connection => connection.expiresAt * 1000));
    // Release blind reviews and close the review window live even if nobody performs an action.
    const room = await memberRoom(connections[0].roomId, connections[0].userId);
    if (room.completedAt) {
      const deadline = (room.completedAt + reviewWindow) * 1000;
      if (deadline > Date.now()) next = Math.min(next, deadline);
    }
    await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, next));
  }

  async alarm() { await this.serial(() => this.broadcast()); }
  async webSocketClose(socket: WebSocket, code: number) {
    try { socket.close(code === 1005 || code === 1006 ? 1000 : code); } catch { /* Already closed. */ }
    await this.serial(() => this.schedule());
  }
  async webSocketError(socket: WebSocket) {
    try { socket.close(1011, 'Connection error'); } catch { /* Already closed. */ }
    await this.serial(() => this.schedule());
  }
}
