import { assertSameOrigin, json, readBody, requireSession } from '@/lib/auth/server';
import { leaveReview } from '@/lib/endorse/collaborations';
import { marketplaceFailure } from '@/lib/endorse/marketplace';
import { publishCollaboration } from '@/lib/endorse/realtime';
export const dynamic = 'force-dynamic';
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await readBody(request, 16384);
    assertSameOrigin(request);
    const { user } = await requireSession(request.headers);
    const { id } = await context.params;
    await leaveReview(id, user.id, body);
    await publishCollaboration(id);
    return json({ ok: true }, 201);
  } catch (error) { return marketplaceFailure(error); }
}
