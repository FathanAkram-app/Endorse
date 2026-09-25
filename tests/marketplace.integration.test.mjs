import test from 'node:test';
import assert from 'node:assert/strict';

const base = process.env.MARKETPLACE_TEST_URL;
test('profile editing, brand ownership, publishing, and public discovery', { skip: !base }, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local test database.');
  const tag = `market-${crypto.randomUUID().slice(0, 8)}`;
  const brandIds = [];
  const cookies = [];
  let creator;
  let company;
  const socialAccounts = [
    { platform: 'Instagram', handle: `@${tag}-photos`, url: `https://instagram.com/${tag}-photos` },
    { platform: 'Instagram', handle: `@${tag}-travel`, url: `https://instagram.com/${tag}-travel` },
    { platform: 'YouTube', handle: `${tag} videos`, url: `https://youtube.com/@${tag}` },
  ];
  const creatorData = { name: `${tag} Creator`, bio: 'I make thoughtful travel videos and photographs.', category: 'Travel', location: 'Bangkok', website: 'https://example.com/portfolio', imageUrl: '', handle: '@testcreator', startingRate: 12345, socialAccounts, published: false };
  const brandData = { name: `${tag} Brand`, tagline: 'A brand for curious people', description: 'We make products for the next great adventure.', category: 'Travel', location: 'Bangkok', website: 'https://example.com', imageUrl: '', published: false };
  async function request(path, { method = 'GET', data, cookie, origin = base } = {}) {
    return fetch(`${base}${path}`, { method, redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: { Origin: origin, ...(data ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {}) });
  }
  async function account(role, suffix) {
    const response = await request('/api/auth/register', { method: 'POST', data: { name: `${tag} ${role}`, email: `${tag}-${suffix}@example.com`, password: 'marketplace-integration-password', role } });
    assert.equal(response.status, 201, await response.clone().text());
    const cookie = response.headers.get('set-cookie').split(';')[0]; cookies.push(cookie);
    return { cookie, user: (await response.json()).user };
  }
  try {
    creator = await account('creator', 'creator');
    company = await account('company', 'company');
    const other = await account('company', 'other');
    assert.equal((await request('/api/profile')).status, 401);
    assert.equal((await request('/api/profile', { method: 'PUT', data: creatorData })).status, 401);
    assert.equal((await request('/api/brands', { method: 'POST', data: brandData, cookie: creator.cookie })).status, 403);
    assert.equal((await request('/api/brands', { cookie: creator.cookie })).status, 403);
    assert.equal((await request('/account/brands/new', { cookie: creator.cookie })).status, 307);
    assert.equal((await request('/account/profile', { cookie: creator.cookie })).status, 200);
    assert.equal((await request('/account/profile', { cookie: company.cookie })).status, 200);
    assert.equal((await request('/api/profile', { method: 'PUT', data: creatorData, cookie: creator.cookie, origin: 'https://evil.example' })).status, 403);
    let response = await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: { ...creatorData, userId: company.user.id, role: 'company', email: 'hijack@example.com' } });
    assert.equal(response.status, 200, await response.clone().text());
    const profile = (await response.json()).profile;
    assert.equal(profile.userId, creator.user.id);
    assert.equal(profile.startingRate, 12345);
    assert.deepEqual(profile.socialAccounts, socialAccounts);
    assert.equal((await (await request('/api/auth/me', { cookie: creator.cookie })).json()).user.role, 'creator');
    assert.equal((await (await request('/api/profile', { cookie: creator.cookie })).json()).profile.bio, creatorData.bio);
    assert.equal((await request(`/creators/${creator.user.id}`)).status, 404);
    assert.equal((await (await request(`/api/explore?q=${tag}`)).json()).total, 0);
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: { ...creatorData, published: true, bio: '' } })).status, 400);
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: { ...creatorData, published: true } })).status, 200);
    const publicProfile = await request(`/creators/${creator.user.id}`);
    assert.equal(publicProfile.status, 200);
    const publicHtml = await publicProfile.text();
    assert.ok(publicHtml.includes(creatorData.name));
    for (const account of socialAccounts) assert.ok(publicHtml.includes(`href="${account.url}"`));
    const discovery = await (await request(`/api/explore?q=${tag}&category=Travel&sort=rate-low`)).json();
    assert.equal(discovery.total, 1);
    assert.equal(discovery.items[0].id, creator.user.id);
    assert.equal(discovery.items[0].email, undefined);
    assert.equal(discovery.items[0].passwordHash, undefined);
    assert.deepEqual(discovery.items[0].socialAccounts, socialAccounts);
    assert.equal((await (await request(`/api/explore?q=${tag}-photos`)).json()).total, 1);
    // More than the old 8 KiB request limit: large social lists must save intact.
    const manyAccounts = Array.from({ length: 50 }, (_, i) => ({ platform: 'Other', handle: `Channel ${i}`, url: `https://example.com/${tag}/${i}?ref=${'x'.repeat(300)}` }));
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: { ...creatorData, published: true, socialAccounts: manyAccounts } })).status, 200);
    assert.deepEqual((await (await request('/api/profile', { cookie: creator.cookie })).json()).profile.socialAccounts, manyAccounts);
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: { ...creatorData, socialAccounts: [socialAccounts[2]], published: true } })).status, 200);
    const legacyPayload = { ...creatorData, published: true }; delete legacyPayload.socialAccounts;
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: legacyPayload })).status, 200);
    assert.deepEqual((await (await request('/api/profile', { cookie: creator.cookie })).json()).profile.socialAccounts, [socialAccounts[2]]);
    assert.equal((await (await request(`/api/explore?q=${tag}-photos`)).json()).total, 0);
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: { ...creatorData, published: true, socialAccounts: [] } })).status, 200);
    const withoutSocials = await (await request(`/creators/${creator.user.id}`)).text();
    assert.ok(!withoutSocials.includes(`href="${socialAccounts[2].url}"`));
    assert.deepEqual((await (await request('/api/profile', { cookie: creator.cookie })).json()).profile.socialAccounts, []);
    assert.equal((await (await request(`/api/explore?q=${tag}&category=Beauty`)).json()).total, 0);
    assert.equal((await (await request('/api/explore?q=%25%27%20OR%201%3D1')).json()).total, 0);
    const companyData = { name: `${tag} Company updated`, bio: 'Company details', category: 'Travel', location: '', website: '', imageUrl: '', published: true };
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: company.cookie, data: companyData })).status, 200);
    assert.equal((await (await request('/api/profile', { cookie: company.cookie })).json()).profile.published, false);
    assert.equal((await request(`/creators/${company.user.id}`)).status, 404);
    response = await request('/api/brands', { method: 'POST', cookie: company.cookie, data: { ...brandData, ownerId: other.user.id } });
    assert.equal(response.status, 201);
    const brand = (await response.json()).brand; brandIds.push(brand.id);
    assert.equal(brand.ownerId, company.user.id);
    assert.equal((await request(`/brands/${brand.id}`)).status, 404);
    assert.equal((await (await request(`/api/explore?kind=brands&q=${tag}`)).json()).total, 0);
    assert.equal((await request(`/api/brands/${brand.id}`, { method: 'PUT', cookie: other.cookie, data: { ...brandData, name: 'Stolen brand' } })).status, 404);
    assert.equal((await request(`/account/brands/${brand.id}/edit`, { cookie: other.cookie })).status, 404);
    assert.equal((await request(`/api/brands/${brand.id}`, { method: 'PUT', cookie: creator.cookie, data: brandData })).status, 403);
    assert.equal((await request(`/api/brands/${brand.id}`, { method: 'PUT', cookie: company.cookie, data: brandData, origin: 'https://evil.example' })).status, 403);
    assert.equal((await (await request('/api/brands', { cookie: other.cookie })).json()).brands.length, 0);
    assert.equal((await request(`/api/brands/${brand.id}`, { method: 'PUT', cookie: company.cookie, data: { ...brandData, website: 'javascript:alert(1)' } })).status, 400);
    assert.equal((await request(`/api/brands/${brand.id}`, { method: 'PUT', cookie: company.cookie, data: { ...brandData, published: true } })).status, 200);
    assert.equal((await request(`/brands/${brand.id}`)).status, 200);
    const brandResults = await (await request(`/api/explore?kind=brands&q=${tag}`)).json();
    assert.equal(brandResults.total, 1);
    assert.equal(brandResults.items[0].companyName, companyData.name);
    assert.equal(brandResults.items[0].ownerId, undefined);
    assert.equal(brandResults.items[0].email, undefined);
    // More than one page verifies pagination and stable IDs across boundaries.
    for (let i = 0; i < 12; i++) {
      response = await request('/api/brands', { method: 'POST', cookie: company.cookie, data: { ...brandData, name: `${tag} Brand ${String(i).padStart(2, '0')}`, published: true } });
      assert.equal(response.status, 201); brandIds.push((await response.json()).brand.id);
    }
    const page1 = await (await request(`/api/explore?kind=brands&q=${tag}&sort=name`)).json();
    const page2 = await (await request(`/api/explore?kind=brands&q=${tag}&sort=name&page=2`)).json();
    assert.equal(page1.total, 13); assert.equal(page1.items.length, 12); assert.equal(page2.items.length, 1);
    assert.equal(new Set([...page1.items, ...page2.items].map((item) => item.id)).size, 13);
    assert.equal((await request(`/explore?kind=brands&q=${tag}`)).status, 200);
    assert.equal((await request(`/account/brands/${brand.id}/edit`, { cookie: company.cookie })).status, 200);
    assert.equal((await request('/account/company', { cookie: company.cookie })).status, 200);
    assert.equal((await request(`/api/brands/${brand.id}`, { method: 'PUT', cookie: company.cookie, data: { ...brandData, published: false } })).status, 200);
    assert.equal((await request(`/brands/${brand.id}`)).status, 404);
    assert.equal((await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: creatorData })).status, 200);
    assert.equal((await request(`/creators/${creator.user.id}`)).status, 404);
    assert.equal((await (await request(`/api/explore?q=${tag}`)).json()).total, 0);
  } finally {
    // Leave test content as private drafts, even if an assertion fails.
    if (creator) await request('/api/profile', { method: 'PUT', cookie: creator.cookie, data: creatorData });
    if (company) for (const id of brandIds) await request(`/api/brands/${id}`, { method: 'PUT', cookie: company.cookie, data: brandData });
    for (const cookie of cookies) await request('/api/auth/logout', { method: 'POST', cookie });
  }
});
