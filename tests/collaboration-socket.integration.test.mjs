import test from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { CollaborationSocket } from '../lib/endorse/collaboration-socket.js';

const base = process.env.COLLABORATION_TEST_URL;
test('WebSockets deliver messages and every workflow step, recover missed events, and enforce privacy', { skip: !base, timeout: 60000 }, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local database.');
  const tag = `live-${crypto.randomUUID().slice(0, 8)}`;
  const accounts = [], peers = [];
  let creator, company, brand;
  const profile = { name: `${tag} creator`, bio: 'I create video content for travel and lifestyle brands.', category: 'Travel', location: '', website: '', imageUrl: '', handle: '', startingRate: null, socialAccounts: [], published: true };
  const brandProfile = { name: `${tag} brand`, tagline: 'Creative travel', description: 'Travel products designed for creative adventures.', category: 'Travel', location: '', website: '', imageUrl: '', published: true };
  async function http(path, actor, method = 'GET', body, expected = 200) {
    const response = await fetch(`${base}${path}`, { method, headers: { Origin: base, ...(actor ? { Cookie: actor.cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
    const text = await response.text();
    assert.equal(response.status, expected, `${path}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : null;
  }
  async function account(role, suffix) {
    const response = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: `${tag} ${suffix}`, email: `${tag}-${suffix}@example.com`, password: 'live-collaboration-test-password', role }), signal: AbortSignal.timeout(10000) });
    const result = await response.json(); assert.equal(response.status, 201, JSON.stringify(result));
    const actor = { user: result.user, cookie: response.headers.get('set-cookie').split(';')[0] }; accounts.push(actor); return actor;
  }
  async function until(predicate, label) {
    const deadline = Date.now() + 7000;
    while (!predicate()) {
      if (Date.now() > deadline) throw new Error(`Timed out: ${label}`);
      await new Promise(resolve => setTimeout(resolve, 15));
    }
  }
  function connect(actor, roomId, initialCursor = 0) {
    const peer = { state: null, messages: new Map(), snapshots: [], statuses: [], errors: [], cursor: initialCursor };
    const url = new URL(`/api/collaborations/${roomId}/socket`, base); url.protocol = 'ws:';
    peer.transport = new CollaborationSocket({ url: url.href, cursor: () => peer.cursor,
      WebSocketClass: class extends WebSocket { constructor(url) { super(url, { headers: { Origin: base, Cookie: actor.cookie } }); } },
      onState: data => {
        peer.state = data; peer.snapshots.push(data);
        for (const message of data.messages) { peer.messages.set(message.id, message); peer.cursor = Math.max(peer.cursor, message.id); }
      }, onStatus: status => { peer.statuses.push(status); peer.status = status; }, onError: error => peer.errors.push(error),
      checkAccess: async () => { const response = await fetch(`${base}/api/collaborations/${roomId}`, { headers: { Cookie: actor.cookie }, signal: AbortSignal.timeout(5000) }); await response.text(); return response.status; },
    });
    peer.transport.connect(); peers.push(peer); return peer;
  }
  function handshake(roomId, actor, origin, expected) {
    return new Promise((resolve, reject) => {
      let responded = false;
      const socket = new WebSocket(`${base.replace('http:', 'ws:')}/api/collaborations/${roomId}/socket`, { headers: { ...(origin ? { Origin: origin } : {}), ...(actor ? { Cookie: actor.cookie } : {}) }, handshakeTimeout: 5000 });
      socket.on('unexpected-response', (_request, response) => { responded = true; response.resume(); socket.terminate(); try { assert.equal(response.statusCode, expected); resolve(); } catch (error) { reject(error); } });
      socket.on('open', () => { socket.close(); reject(new Error('Unauthorized socket was accepted.')); });
      socket.on('error', error => {
        if (responded) return;
        // Vite's development upgrade proxy closes rejected upgrades without forwarding their HTTP body/status.
        if (error.code === 'ECONNRESET') resolve(); else reject(error);
      });
    });
  }
  async function action(peer, kind, extra = {}) {
    const version = peer.state.room.version;
    await peer.transport.command('action', { action: kind, version, ...extra });
    await until(() => peer.state.room.version > version, kind);
  }
  try {
    creator = await account('creator', 'creator'); company = await account('company', 'company');
    const outsider = await account('company', 'outsider');
    await http('/api/profile', creator, 'PUT', profile);
    brand = (await http('/api/brands', company, 'POST', brandProfile, 201)).brand;
    const start = { brandId: brand.id, creatorId: creator.user.id, message: 'Discuss our live project.', clientId: crypto.randomUUID() };
    const room = (await http('/api/collaborations', company, 'POST', start, 201)).room;
    await handshake(room.id, null, base, 401);
    await handshake(room.id, outsider, base, 404);
    await handshake(room.id, creator, 'https://evil.example', 403);
    await handshake(room.id, creator, null, 403);
    const client = connect(company, room.id), talent = connect(creator, room.id);
    await until(() => client.status === 'live' && talent.status === 'live', 'both connections live');
    assert.equal(client.state.room.status, 'discussion');
    const first = { message: 'This message arrives through the WebSocket.', clientId: crypto.randomUUID() };
    await talent.transport.command('message', first);
    await until(() => [...client.messages.values()].some(item => item.clientId === first.clientId), 'message received by company');
    await talent.transport.command('message', first);
    assert.equal((await http(`/api/collaborations/${room.id}`, company)).messages.filter(item => item.clientId === first.clientId).length, 1);
    const otherRoom = (await http('/api/collaborations', company, 'POST', { ...start, clientId: crypto.randomUUID() }, 201)).room;
    const isolated = connect(company, otherRoom.id);
    await until(() => isolated.status === 'live', 'isolated room connected');
    const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const terms = { title: 'Live content project', scope: 'Create a concept and a final travel video for launch.', usageRights: 'Organic social use only for 90 days; no exclusivity.', revisions: 1, milestones: [{ title: 'Concept', amount: 1000, dueDate }, { title: 'Final video', amount: 2000, dueDate }] };
    await assert.rejects(talent.transport.command('action', { action: 'offer', version: 0, terms }), /not available/);
    await action(client, 'offer', { terms });
    await until(() => talent.state.room.status === 'offer', 'creator sees offer live');
    assert.ok(talent.state.actions.includes('accept')); assert.ok(!client.state.actions.includes('accept'));
    await action(talent, 'decline');
    await until(() => client.state.room.status === 'discussion', 'decline live');
    await action(client, 'offer', { terms });
    await action(client, 'withdraw');
    await until(() => talent.state.room.status === 'discussion', 'withdraw live');
    await action(client, 'offer', { terms });
    await until(() => talent.state.room.status === 'offer', 'new offer live');
    await action(talent, 'accept');
    await until(() => client.state.room.status === 'active', 'acceptance live');
    await action(talent, 'submit', { note: 'Concept ready for review.', url: 'https://example.com/concept' });
    await until(() => client.state.room.status === 'submitted', 'submission live');
    await action(client, 'revise', { note: 'Please update the opening shot.' });
    await until(() => talent.state.room.status === 'active', 'revision live');
    // Stop the network connection, persist more than one page, and reconnect from its cursor.
    talent.transport.stop();
    const cursor = talent.cursor;
    for (let i = 0; i < 52; i++) await http(`/api/collaborations/${room.id}/messages`, company, 'POST', { message: `While disconnected ${i}`, clientId: crypto.randomUUID() });
    const recovered = connect(creator, room.id, cursor);
    await until(() => recovered.status === 'live', 'reconnect caught up');
    assert.equal([...recovered.messages.values()].filter(item => item.body.startsWith('While disconnected')).length, 52);
    await action(recovered, 'submit', { note: 'Revised concept.', url: 'https://example.com/revised' });
    await until(() => client.state.room.status === 'submitted', 'revised delivery live');
    await action(client, 'approve');
    await until(() => recovered.state.room.milestone === 1 && recovered.state.room.status === 'active', 'next milestone live');
    await action(recovered, 'request-cancel', { note: 'We may need to change the schedule.' });
    await until(() => client.state.room.cancellationBy === creator.user.id, 'cancellation request live');
    await action(client, 'reject-cancel');
    await until(() => !recovered.state.room.cancellationBy, 'cancellation rejection live');
    await action(recovered, 'submit', { note: 'Final video ready.', url: 'https://example.com/video' });
    await until(() => client.state.room.status === 'submitted', 'final submission live');
    await action(client, 'approve');
    await until(() => recovered.state.room.status === 'completed', 'completion live');
    const privateReview = 'Excellent work, this must stay blind initially.';
    await client.transport.command('review', { rating: 5, comment: privateReview });
    await until(() => client.state.reviews.length === 1, 'own review live');
    assert.equal(recovered.state.reviews.length, 0);
    assert.ok(!JSON.stringify(recovered.snapshots).includes(privateReview), 'Unreleased feedback cannot appear in any socket packet.');
    await recovered.transport.command('review', { rating: 4, comment: 'Clear scope and thoughtful feedback.' });
    await until(() => client.state.reviews.length === 2 && recovered.state.reviews.length === 2, 'both reviews released live');
    assert.equal(isolated.state.room.status, 'discussion');
    assert.ok(!JSON.stringify(isolated.snapshots).includes(privateReview));
    // Unexpected disconnect reconnects automatically, with state recovery.
    client.transport.socket.terminate();
    await until(() => client.status === 'reconnecting', 'disconnect detected');
    await until(() => client.status === 'live', 'automatic reconnect');
    assert.equal(client.state.room.status, 'completed');
    // Existing sockets lose access after logout, including on heartbeat and broadcast.
    await http('/api/auth/logout', creator, 'POST');
    recovered.transport.socket.send(JSON.stringify({ type: 'ping' }));
    await until(() => recovered.status === 'ended', 'revoked session closed');
    const expired = connect(creator, room.id);
    await until(() => expired.status === 'ended', 'failed handshake diagnoses ended session');
    assert.equal(client.errors.length, 0);
  } finally {
    for (const peer of peers) peer.transport.stop();
    const cleanup = [];
    // The creator was logged out during the test; sign in only to unpublish its test listing.
    if (creator) {
      const response = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `${tag}-creator@example.com`, password: 'live-collaboration-test-password' }), signal: AbortSignal.timeout(10000) });
      await response.text();
      if (response.ok) { creator.cookie = response.headers.get('set-cookie').split(';')[0]; cleanup.push(http('/api/profile', creator, 'PUT', { ...profile, published: false })); }
    }
    if (brand) cleanup.push(http(`/api/brands/${brand.id}`, company, 'PUT', { ...brandProfile, published: false }));
    const results = await Promise.allSettled(cleanup);
    for (const actor of accounts) results.push(...await Promise.allSettled([http('/api/auth/logout', actor, 'POST')]));
    for (const result of results) if (result.status === 'rejected') console.warn('Test cleanup failed:', result.reason.message);
  }
});
