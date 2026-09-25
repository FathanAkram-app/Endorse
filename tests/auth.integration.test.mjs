import test from 'node:test';
import assert from 'node:assert/strict';

// Run only against a local development database: AUTH_TEST_URL=http://localhost:5173 npm test
const base = process.env.AUTH_TEST_URL;
test('HTTP authentication lifecycle and role isolation', { skip: !base }, async () => {
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Use a local test database.');
  const password = 'integration-test-password';
  const suffix = crypto.randomUUID();
  async function request(path, { method = 'GET', data, cookie, origin = base } = {}) {
    const response = await fetch(`${base}${path}`, {
      method, redirect: 'manual', headers: { Origin: origin, ...(data ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
    return response;
  }
  assert.equal((await request('/api/auth/me')).status, 401);
  assert.equal((await request('/account/creator')).status, 307);
  assert.equal((await request('/api/auth/register', { method: 'POST', data: {}, origin: 'https://evil.example' })).status, 403);
  assert.equal((await request('/api/auth/register', { method: 'POST', data: { name: 'Test', email: `invalid-${suffix}@example.com`, password, role: 'admin' } })).status, 400);
  assert.equal((await request('/api/auth/register', { method: 'POST', data: { name: 'Test', email: `short-${suffix}@example.com`, password: 'short', role: 'creator' } })).status, 400);
  for (const role of ['creator', 'company']) {
    const email = `${role}-${suffix}@example.com`;
    const data = { name: `Test ${role}`, email, password, role };
    const registered = await request('/api/auth/register', { method: 'POST', data });
    assert.equal(registered.status, 201, await registered.clone().text());
    const setCookie = registered.headers.get('set-cookie');
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    const cookie = setCookie.split(';')[0];
    assert.equal((await registered.json()).user.role, role);
    const me = await request('/api/auth/me', { cookie });
    assert.equal(me.headers.get('cache-control'), 'no-store');
    assert.equal((await me.json()).user.email, email);
    assert.equal((await request(`/api/account/${role}`, { cookie })).status, 200);
    assert.equal((await request(`/api/account/${role === 'creator' ? 'company' : 'creator'}`, { cookie })).status, 403);
    const page = await request(`/account/${role}`, { cookie });
    assert.equal(page.status, 200);
    assert.ok((await page.text()).includes(`Test ${role}`));
    const wrongPage = await request(`/account/${role === 'creator' ? 'company' : 'creator'}`, { cookie });
    assert.equal(wrongPage.status, 307);
    assert.equal(wrongPage.headers.get('location'), `/account/${role}`);
    assert.equal((await request('/api/auth/register', { method: 'POST', data: { ...data, email: email.toUpperCase() } })).status, 409);
    assert.equal((await request('/api/auth/login', { method: 'POST', data: { email, password: 'incorrect password' } })).status, 401);
    assert.equal((await request('/api/auth/logout', { method: 'POST', cookie, origin: 'https://evil.example' })).status, 403);
    assert.equal((await request('/api/auth/me', { cookie })).status, 200);
    const loggedOut = await request('/api/auth/logout', { method: 'POST', cookie });
    assert.equal(loggedOut.status, 200);
    assert.match(loggedOut.headers.get('set-cookie'), /Max-Age=0/);
    assert.equal((await request('/api/auth/me', { cookie })).status, 401, 'Logged-out tokens must be revoked');
    const login = await request('/api/auth/login', { method: 'POST', data: { email: email.toUpperCase(), password, role: 'admin' } });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).user.role, role, 'Login cannot override stored role');
    const newCookie = login.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/auth/me', { cookie: `${newCookie}tampered` })).status, 401);
    await request('/api/auth/logout', { method: 'POST', cookie: newCookie });
  }
  const email = `missing-${suffix}@example.com`;
  for (let i = 0; i < 10; i++) assert.equal((await request('/api/auth/login', { method: 'POST', data: { email, password } })).status, 401);
  assert.equal((await request('/api/auth/login', { method: 'POST', data: { email, password } })).status, 429);
});
