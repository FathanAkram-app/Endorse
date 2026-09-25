import { getDb } from '@/db';
import { brands } from '@/db/schema';
import { assertSameOrigin, AuthError, json, readBody, requireSession } from '@/lib/auth/server';
import { marketplaceFailure, ownBrands } from '@/lib/endorse/marketplace';
import { brandSchema } from '@/lib/endorse/profile-validation';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { user } = await requireSession(request.headers, 'company');
    return json({ brands: await ownBrands(user.id) });
  } catch (error) { return marketplaceFailure(error); }
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    assertSameOrigin(request);
    const { user } = await requireSession(request.headers, 'company');
    const result = brandSchema.safeParse(body);
    if (!result.success) throw new AuthError(400, result.error.issues[0].message);
    const now = Math.floor(Date.now() / 1000);
    const [brand] = await getDb().insert(brands).values({ ...result.data, id: crypto.randomUUID(), ownerId: user.id, createdAt: now, updatedAt: now }).returning();
    return json({ brand }, 201);
  } catch (error) { return marketplaceFailure(error); }
}
