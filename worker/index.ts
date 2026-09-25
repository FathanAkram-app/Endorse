import handler from 'vinext/server/fetch-handler';
import { assertSameOrigin, AuthError, json, requireSession } from '../lib/auth/server';
import { memberRoom } from '../lib/endorse/collaborations';
import { marketplaceFailure } from '../lib/endorse/marketplace';

export { CollaborationRoom } from './collaboration-room';

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext) {
    const match = new URL(request.url).pathname.match(/^\/api\/collaborations\/([0-9a-f-]{36})\/socket$/i);
    if (!match) return handler.fetch(request, env, ctx);
    try {
      if (request.method !== 'GET' || request.headers.get('upgrade')?.toLowerCase() !== 'websocket') {
        return json({ error: 'A WebSocket connection is required.' }, 426);
      }
      assertSameOrigin(request);
      const { user } = await requireSession(request.headers);
      await memberRoom(match[1], user.id);
      if (!env.COLLABORATION_ROOMS) throw new AuthError(503, 'Live conversations are temporarily unavailable.');
      return env.COLLABORATION_ROOMS.getByName(match[1]).fetch(request);
    } catch (error) { return marketplaceFailure(error); }
  },
};
