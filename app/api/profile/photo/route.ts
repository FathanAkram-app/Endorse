import { assertSameOrigin, AuthError, json, requireSession } from '@/lib/auth/server';
import { marketplaceFailure } from '@/lib/endorse/marketplace';
import { photoContentType } from '@/lib/endorse/profile-photo';
import { photoBucket, photoKey, readPhoto } from '@/lib/endorse/photo-storage';

export async function POST(request: Request) {
  try {
    const bytes = await readPhoto(request);
    assertSameOrigin(request);
    const { user } = await requireSession(request.headers, 'creator');
    const contentType = photoContentType(bytes);
    if (!contentType) throw new AuthError(415, 'Choose a JPEG, PNG, or WebP photo.');
    const id = crypto.randomUUID();
    await photoBucket().put(photoKey(id), bytes, {
      httpMetadata: { contentType }, customMetadata: { ownerId: user.id },
    });
    return json({ imageUrl: `/api/profile/photo/${id}` }, 201);
  } catch (error) { return marketplaceFailure(error); }
}
