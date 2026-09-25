import test from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { createToken, hashPassword, SESSION_SECONDS, signingKey, verifyPassword, verifyToken } from '../lib/auth/crypto.js';

const secret = 'test-only-secret-with-at-least-32-bytes';

test('passwords use independent salts and reject incorrect credentials', async () => {
  const password = 'a long password for testing';
  const first = await hashPassword(password);
  const second = await hashPassword(password);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword(password, first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
  assert.equal(await verifyPassword(password, 'invalid'), false);
});

test('JWT binds identity and role and rejects tampering, expiration, and wrong secrets', async () => {
  const token = await createToken({ id: 'user-1', role: 'creator' }, 'session-1', secret);
  const claims = await verifyToken(token, secret);
  assert.equal(claims.sub, 'user-1');
  assert.equal(claims.role, 'creator');
  assert.equal(claims.jti, 'session-1');
  assert.equal(claims.exp - claims.iat, SESSION_SECONDS);
  const parts = token.split('.');
  parts[1] = Buffer.from(JSON.stringify({ ...claims, role: 'company' })).toString('base64url');
  await assert.rejects(verifyToken(parts.join('.'), secret));
  await assert.rejects(verifyToken(token, 'another-test-secret-at-least-32-bytes'));
  const expired = await createToken({ id: 'user-1', role: 'creator' }, 'session-1', secret, 1000);
  await assert.rejects(verifyToken(expired, secret));
  assert.throws(() => signingKey('short'));
});

test('JWT rejects unsupported roles, wrong audiences and algorithms, and missing expiration', async () => {
  const now = Math.floor(Date.now() / 1000);
  for (const [role, audience, algorithm, expiration] of [
    ['admin', 'endorse-web', 'HS256', now + 100],
    ['creator', 'other-app', 'HS256', now + 100],
    ['creator', 'endorse-web', 'HS384', now + 100],
    ['creator', 'endorse-web', 'HS256', undefined],
  ]) {
    const token = await new SignJWT({ role, ...(expiration ? { exp: expiration } : {}) })
      .setProtectedHeader({ alg: algorithm, typ: 'JWT' }).setSubject('user-1').setJti('session-1')
      .setIssuer('endorse').setAudience(audience).setIssuedAt(now).sign(signingKey(secret));
    await assert.rejects(verifyToken(token, secret));
  }
});
