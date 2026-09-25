import { assertSameOrigin, json, readBody, requireSession } from '@/lib/auth/server';
import { inbox, startCollaboration } from '@/lib/endorse/collaborations';
import { marketplaceFailure } from '@/lib/endorse/marketplace';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { user } = await requireSession(request.headers);
    const page = Math.max(1, Math.min(10000, Number(new URL(request.url).searchParams.get('page')) || 1));
    return json(await inbox(user.id, (Math.floor(page) - 1) * 20));
  } catch (error) { return marketplaceFailure(error); }
}
export async function POST(request: Request) {
  try {
    const body = await readBody(request, 32768);
    assertSameOrigin(request);
    const { user } = await requireSession(request.headers);
    return json({ room: await startCollaboration(user, body) }, 201);
  } catch (error) { return marketplaceFailure(error); }
}
