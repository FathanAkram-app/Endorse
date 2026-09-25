import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';

export const SESSION_SECONDS = 8 * 60 * 60;
const issuer = 'endorse';
const audience = 'endorse-web';

export function signingKey(secret) {
  if (typeof secret !== 'string' || new TextEncoder().encode(secret).length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 bytes.');
  }
  return new TextEncoder().encode(secret);
}

function derive(password, salt) {
  // 16 MiB per derivation; p=5 keeps the work factor suitable for passwords.
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, { N: 16384, r: 8, p: 5, maxmem: 32 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key));
  });
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await derive(password, salt);
  return `scrypt:16384:8:5:${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  if (!/^scrypt:16384:8:5:[a-f0-9]{32}:[a-f0-9]{128}$/.test(stored)) return false;
  const [, , , , salt, hash] = stored.split(':');
  const actual = await derive(password, salt);
  return timingSafeEqual(actual, Buffer.from(hash, 'hex'));
}

// A missing email still incurs the same password work as an existing account.
export const DUMMY_PASSWORD_HASH = `scrypt:16384:8:5:${'0'.repeat(32)}:${'0'.repeat(128)}`;

export async function createToken(user, sessionId, secret, now = Math.floor(Date.now() / 1000)) {
  return new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id).setJti(sessionId).setIssuer(issuer).setAudience(audience)
    .setIssuedAt(now).setExpirationTime(now + SESSION_SECONDS).sign(signingKey(secret));
}

export async function verifyToken(token, secret) {
  const { payload } = await jwtVerify(token, signingKey(secret), {
    algorithms: ['HS256'], issuer, audience, typ: 'JWT',
    requiredClaims: ['sub', 'jti', 'iat', 'exp', 'role'],
    maxTokenAge: SESSION_SECONDS,
  });
  if (!payload.sub || !payload.jti || !['creator', 'company'].includes(payload.role)) {
    throw new Error('Invalid session claims.');
  }
  return payload;
}
