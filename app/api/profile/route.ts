import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { profiles, users } from '@/db/schema';
import { assertSameOrigin, AuthError, json, readBody, requireSession } from '@/lib/auth/server';
import { marketplaceFailure, ownProfile } from '@/lib/endorse/marketplace';
import { profileSchema } from '@/lib/endorse/profile-validation';
import { assertOwnedPhoto } from '@/lib/endorse/photo-storage';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const { user } = await requireSession(request.headers);
    return json({ profile: await ownProfile(user), role: user.role });
  } catch (error) { return marketplaceFailure(error); }
}

export async function PUT(request: Request) {
  try {
    // Consume the bounded JSON body before an early auth response so Workers
    // can safely reuse the HTTP connection for the next request.
    const body = await readBody(request, 128 * 1024);
    assertSameOrigin(request);
    const { user } = await requireSession(request.headers);
    const result = profileSchema(user.role).safeParse(body);
    if (!result.success) throw new AuthError(400, result.error.issues[0].message);
    if (user.role === 'creator') await assertOwnedPhoto(result.data.imageUrl, user.id);
    const data = { ...result.data, updatedAt: Math.floor(Date.now() / 1000),
      ...(user.role === 'company' ? { published: false, handle: '', startingRate: null, socialAccounts: [] } : {}) };
    const db = getDb();
    await db.batch([
      db.insert(profiles).values({ ...data, userId: user.id })
        .onConflictDoUpdate({ target: profiles.userId, set: data }),
      db.update(users).set({ name: data.name }).where(eq(users.id, user.id)),
    ]);
    return json({ profile: await ownProfile(user) });
  } catch (error) { return marketplaceFailure(error); }
}
