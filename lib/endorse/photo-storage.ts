import { env } from 'cloudflare:workers';
import { AuthError } from '@/lib/auth/server';
import { MAX_PHOTO_BYTES, PHOTO_PATH_PATTERN } from './profile-photo';

export function photoBucket() {
  if (!env.BUCKET) throw new AuthError(503, 'Photo uploads are temporarily unavailable. Please try again later.');
  return env.BUCKET;
}

export function photoKey(id: string) { return `profile-photos/${id}`; }

export async function readPhoto(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError(400, 'Choose a photo to upload.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_PHOTO_BYTES) { await reader.cancel(); throw new AuthError(413, 'Choose a photo smaller than 5 MB.'); }
    chunks.push(value);
  }
  if (!size) throw new AuthError(400, 'Choose a photo to upload.');
  return Buffer.concat(chunks);
}

export async function assertOwnedPhoto(imageUrl: string, userId: string) {
  if (!PHOTO_PATH_PATTERN.test(imageUrl)) return;
  const object = await photoBucket().head(photoKey(imageUrl.split('/').at(-1)!));
  if (!object || object.customMetadata?.ownerId !== userId) throw new AuthError(400, 'Choose a photo uploaded from your own account.');
}
