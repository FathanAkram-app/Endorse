import { and, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import { profiles, users } from '@/db/schema';
import { getSession, json } from '@/lib/auth/server';
import { marketplaceFailure } from '@/lib/endorse/marketplace';
import { PHOTO_PATH_PATTERN, PHOTO_TYPES } from '@/lib/endorse/profile-photo';
import { photoBucket, photoKey } from '@/lib/endorse/photo-storage';

export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const imageUrl = `/api/profile/photo/${id}`;
    if (!PHOTO_PATH_PATTERN.test(imageUrl)) return json({ error: 'Photo not found.' }, 404);
    const bucket = photoBucket();
    const metadata = await bucket.head(photoKey(id));
    const ownerId = metadata?.customMetadata?.ownerId;
    if (!metadata || !ownerId) return json({ error: 'Photo not found.' }, 404);
    const [profile] = await getDb().select({ userId: profiles.userId }).from(profiles)
      .innerJoin(users, eq(users.id, profiles.userId)).where(and(
        eq(profiles.userId, ownerId), eq(profiles.imageUrl, imageUrl), eq(profiles.published, true), eq(users.role, 'creator'),
      )).limit(1);
    // Unpublished, staged and replaced photos are visible only to their owner.
    if (!profile) {
      const session = await getSession(request.headers);
      if (session?.user.id !== ownerId) return json({ error: 'Photo not found.' }, 404);
    }
    const object = await bucket.get(photoKey(id));
    if (!object || !PHOTO_TYPES.includes(object.httpMetadata?.contentType ?? '')) return json({ error: 'Photo not found.' }, 404);
    return new Response(object.body, { headers: {
      'Content-Type': object.httpMetadata!.contentType!,
      'Content-Length': String(object.size),
      'Cache-Control': 'no-store', Vary: 'Cookie',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-origin',
    } });
  } catch (error) { return marketplaceFailure(error); }
}
