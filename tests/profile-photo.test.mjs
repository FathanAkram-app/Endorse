import test from 'node:test';
import assert from 'node:assert/strict';
import { photoContentType, PHOTO_PATH_PATTERN } from '../lib/endorse/profile-photo.js';
import { profileSchema } from '../lib/endorse/profile-validation.js';

test('photo signatures distinguish supported raster formats from active content', () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  assert.equal(photoContentType(png), 'image/png');
  assert.equal(photoContentType(Buffer.from([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1])), 'image/jpeg');
  assert.equal(photoContentType(Buffer.from('RIFF0000WEBPVP8 ')), 'image/webp');
  assert.equal(photoContentType(Buffer.from('<svg onload="alert(1)"></svg>')), null);
  assert.equal(photoContentType(Buffer.from('<html>not a photo</html>')), null);
  assert.equal(photoContentType(Buffer.from([137, 80, 78])), null);
});

test('only creator profiles accept an exact uploaded photo path', () => {
  const path = '/api/profile/photo/0f03afc4-8129-4000-8100-517867eb51fe';
  const profile = { name: 'Creator', bio: '', category: '', location: '', website: '', imageUrl: path, handle: '', startingRate: null, published: false };
  assert.ok(profileSchema('creator').safeParse(profile).success);
  assert.equal(profileSchema('company').safeParse(profile).success, false);
  for (const imageUrl of ['/api/profile/photo/../auth/me', '//evil.example/image', `${path}?url=elsewhere`, '/other.jpg']) {
    assert.equal(PHOTO_PATH_PATTERN.test(imageUrl), false);
    assert.equal(profileSchema('creator').safeParse({ ...profile, imageUrl }).success, false);
  }
  assert.ok(profileSchema('creator').safeParse({ ...profile, imageUrl: 'https://example.com/existing.jpg' }).success);
});
