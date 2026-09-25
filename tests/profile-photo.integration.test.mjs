import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_PHOTO_BYTES } from '../lib/endorse/profile-photo.js';

const base = process.env.PHOTO_TEST_URL;
test('uploaded profile photos persist, enforce ownership, and follow profile visibility', { skip: !base }, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  const tag = crypto.randomUUID();
  const cookies = [];
  let creator;
  const profile = { name: 'Photo test creator', bio: 'A creator testing profile photo uploads.', category: 'Travel', location: '', website: '', imageUrl: '', handle: '', startingRate: null, published: false };
  async function request(path, { method = 'GET', data, bytes, cookie, origin = base, type = 'image/png' } = {}) {
    return fetch(`${base}${path}`, { method, redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(data ? { 'Content-Type': 'application/json' } : bytes ? { 'Content-Type': type } : {}) },
      ...(data ? { body: JSON.stringify(data) } : bytes ? { body: bytes } : {}),
    });
  }
  async function register(role, suffix) {
    const response = await request('/api/auth/register', { method: 'POST', data: { name: 'Photo test', email: `${tag}-${suffix}@example.com`, password: 'photo-test-password', role } });
    assert.equal(response.status, 201, await response.clone().text());
    const cookie = response.headers.get('set-cookie').split(';')[0]; cookies.push(cookie);
    return { cookie, user: (await response.json()).user };
  }
  try {
    creator = await register('creator', 'creator');
    const other = await register('creator', 'other');
    const company = await register('company', 'company');
    assert.equal((await request('/api/profile/photo', { method: 'POST', bytes: png })).status, 401);
    assert.equal((await request('/api/profile/photo', { method: 'POST', bytes: png, cookie: company.cookie })).status, 403);
    assert.equal((await request('/api/profile/photo', { method: 'POST', bytes: png, cookie: creator.cookie, origin: 'https://evil.example' })).status, 403);
    assert.equal((await request('/api/profile/photo', { method: 'POST', bytes: Buffer.from('<svg onload="alert(1)"></svg>'), cookie: creator.cookie })).status, 415);
    assert.equal((await request('/api/profile/photo', { method: 'POST', bytes: Buffer.alloc(0), cookie: creator.cookie })).status, 400);
    assert.equal((await request('/api/profile/photo', { method: 'POST', bytes: Buffer.alloc(MAX_PHOTO_BYTES + 1), cookie: creator.cookie })).status, 413);
    const uploaded = await request('/api/profile/photo', { method: 'POST', bytes: png, cookie: creator.cookie });
    assert.equal(uploaded.status, 201, await uploaded.clone().text());
    const { imageUrl } = await uploaded.json();
    assert.match(imageUrl, /^\/api\/profile\/photo\/[a-f0-9-]+$/);
    assert.equal((await request(imageUrl)).status, 404, 'Staged uploads must stay private');
    assert.equal((await request(imageUrl, { cookie: other.cookie })).status, 404);
    const owned = await request(imageUrl, { cookie: creator.cookie });
    assert.equal(owned.status, 200);
    assert.equal(owned.headers.get('content-type'), 'image/png');
    assert.equal(owned.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await owned.arrayBuffer()), png);
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: other.cookie, data: { ...profile, imageUrl } })).status, 400);
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: { ...profile, imageUrl } })).status, 200);
    assert.equal((await request(imageUrl)).status, 404, 'Draft profile photos must stay private');
    const saved = await (await request('/api/profile', { cookie: creator.cookie })).json();
    assert.equal(saved.profile.imageUrl, imageUrl);
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: { ...profile, imageUrl, published: true } })).status, 200);
    const publishedPhoto = await request(imageUrl);
    assert.equal(publishedPhoto.status, 200);
    assert.equal(publishedPhoto.headers.get('cache-control'), 'no-store');
    const publicHtml = await (await request(`/creators/${creator.user.id}`)).text();
    assert.ok(publicHtml.includes(imageUrl));
    const editHtml = await (await request('/account/profile', { cookie: creator.cookie })).text();
    assert.ok(editHtml.includes('type="file"'));
    assert.ok(!editHtml.includes('Profile photo URL'));
    const replacement = await request('/api/profile/photo', { method: 'POST', bytes: png, cookie: creator.cookie });
    const replacementUrl = (await replacement.json()).imageUrl;
    assert.notEqual(replacementUrl, imageUrl);
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: { ...profile, imageUrl: replacementUrl, published: true } })).status, 200);
    assert.equal((await request(imageUrl)).status, 404, 'Replaced photos must stop being public');
    assert.equal((await request(replacementUrl)).status, 200);
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: { ...profile, published: true } })).status, 200);
    assert.equal((await request(replacementUrl)).status, 404, 'Removing the photo must stop public access');
  } finally {
    if (creator) await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: profile });
    for (const cookie of cookies) await request('/api/auth/logout', { method: 'POST', cookie });
  }
});
