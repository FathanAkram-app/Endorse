import { assertSameOrigin, json, readBody, requireSession } from '@/lib/auth/server';
import { roomData, transition } from '@/lib/endorse/collaborations';
import { marketplaceFailure } from '@/lib/endorse/marketplace';
import { publishCollaboration } from '@/lib/endorse/realtime';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { user } = await requireSession(request.headers);
    const before = Number(new URL(request.url).searchParams.get('before'));
    const after = Number(new URL(request.url).searchParams.get('after'));
    return json(await roomData((await context.params).id, user.id, Number.isSafeInteger(before) && before > 0 ? before : undefined,
      Number.isSafeInteger(after) && after > 0 && !before ? after : undefined));
  } catch (error) { return marketplaceFailure(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const body = await readBody(request, 65536);
    assertSameOrigin(request);
    const { user } = await requireSession(request.headers);
    const { id } = await context.params;
    await transition(id, user.id, body);
    await publishCollaboration(id);
    return json(await roomData(id, user.id));
  } catch (error) { return marketplaceFailure(error); }
}
