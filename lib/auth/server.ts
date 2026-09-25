import { env } from 'cloudflare:workers';
import { and, eq, gt, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/db';
import { authAttempts, sessions, users } from '@/db/schema';
import { createToken, DUMMY_PASSWORD_HASH, hashPassword, SESSION_SECONDS, signingKey, verifyPassword, verifyToken } from './crypto';

export const COOKIE_NAME = 'endorse_session';
export type Role = 'creator' | 'company';
export class AuthError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  password: z.string().min(1, 'Enter your password.').max(128, 'Password must be at most 128 characters.'),
});
const registration = credentials.extend({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
  password: z.string().min(12, 'Use at least 12 characters for your password.').max(128),
  role: z.enum(['creator', 'company'], { errorMap: () => ({ message: 'Choose a creator or company account.' }) }),
});

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', Vary: 'Cookie', ...headers } });
}

export function failure(error: unknown) {
  if (error instanceof AuthError) return json({ error: error.message }, error.status,
    error.status === 429 ? { 'Retry-After': '900' } : {});
  // Never expose database errors, submitted credentials, or tokens to clients/logs.
  console.error('Authentication request failed. Check the database and JWT_SECRET configuration.');
  return json({ error: 'Authentication is temporarily unavailable. Please try again later.' }, 503);
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new AuthError(403, 'This request must come from this site.');
  }
}

export async function readBody(request: Request, maxBytes = 8192) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new AuthError(415, 'Send a JSON request.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AuthError(400, 'Enter your account details.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > maxBytes) { await reader.cancel(); throw new AuthError(413, 'Request is too large.'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AuthError(400, 'Enter valid account details.'); }
}

function secret() {
  signingKey(env.JWT_SECRET); // Fail closed before any account changes.
  return env.JWT_SECRET!;
}

function cookie(token: string, request: Request, clear = false) {
  const secure = new URL(request.url).protocol === 'https:';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_SECONDS}${secure ? '; Secure' : ''}`;
}

export function readCookie(headers: Headers) {
  return headers.get('cookie')?.split(';').map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
}

export async function getSession(headers: Headers) {
  const token = readCookie(headers);
  if (!token) return null;
  const key = secret();
  let claims;
  try { claims = await verifyToken(token, key); } catch { return null; }
  const [row] = await getDb().select({
    sessionId: sessions.id, id: users.id, email: users.email, name: users.name,
    role: users.role, createdAt: users.createdAt,
  }).from(sessions).innerJoin(users, eq(users.id, sessions.userId)).where(and(
    eq(sessions.id, claims.jti!), eq(users.id, claims.sub!),
    gt(sessions.expiresAt, Math.floor(Date.now() / 1000)),
  )).limit(1);
  if (!row || row.role !== claims.role) return null;
  const { sessionId, ...user } = row;
  return { sessionId, user };
}

export async function requireSession(headers: Headers, role?: Role) {
  const session = await getSession(headers);
  if (!session) throw new AuthError(401, 'Please log in to continue.');
  if (role && session.user.role !== role) throw new AuthError(403, 'This page is for a different account type.');
  return session;
}

async function rateLimit(request: Request, email: string, key: string) {
  const db = getDb();
  const now = Math.floor(Date.now() / 1000);
  // HMAC keeps email/IP values out of the rate-limit table. CF sets this IP header.
  const hmacKey = await crypto.subtle.importKey('raw', signingKey(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const buckets: [string, number][] = [[`ip:${request.headers.get('cf-connecting-ip') || 'local'}`, 50], [`email:${email}`, 10]];
  await db.delete(authAttempts).where(lt(authAttempts.expiresAt, now));
  for (const [value, limit] of buckets) {
    const digest = await crypto.subtle.sign('HMAC', hmacKey, new TextEncoder().encode(value));
    const id = Buffer.from(digest).toString('hex');
    const [attempt] = await db.insert(authAttempts).values({ key: id, count: 1, expiresAt: now + 900 })
      .onConflictDoUpdate({ target: authAttempts.key, set: { count: sql`${authAttempts.count} + 1` } }).returning();
    if (attempt.count > limit) throw new AuthError(429, 'Too many attempts. Please try again in 15 minutes.');
  }
}

export async function authenticate(request: Request, signup: boolean) {
  try {
    assertSameOrigin(request);
    const key = secret();
    const body = await readBody(request);
    const parsed = (signup ? registration : credentials).safeParse(body);
    if (!parsed.success) throw new AuthError(400, parsed.error.issues[0].message);
    const { email, password } = parsed.data;
    await rateLimit(request, email, key);
    const db = getDb();
    const now = Math.floor(Date.now() / 1000);
    const sessionId = crypto.randomUUID();
    let user;
    if (signup) {
      const { name, role } = registration.parse(body);
      user = { id: crypto.randomUUID(), email, name, role, createdAt: now };
      const passwordHash = await hashPassword(password);
      const token = await createToken(user, sessionId, key, now);
      try {
        await db.batch([
          db.insert(users).values({ ...user, passwordHash }),
          db.insert(sessions).values({ id: sessionId, userId: user.id, expiresAt: now + SESSION_SECONDS }),
        ]);
      } catch (error) {
        const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
        if (existing) throw new AuthError(409, 'An account with this email already exists. Please log in.');
        throw error;
      }
      return json({ user }, 201, { 'Set-Cookie': cookie(token, request) });
    }
    const [record] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const valid = await verifyPassword(password, record?.passwordHash || DUMMY_PASSWORD_HASH);
    if (!record || !valid) throw new AuthError(401, 'Email or password is incorrect.');
    user = { id: record.id, email: record.email, name: record.name, role: record.role, createdAt: record.createdAt };
    const token = await createToken(user, sessionId, key, now);
    await db.batch([
      db.delete(sessions).where(lt(sessions.expiresAt, now)),
      db.insert(sessions).values({ id: sessionId, userId: user.id, expiresAt: now + SESSION_SECONDS }),
    ]);
    return json({ user }, 200, { 'Set-Cookie': cookie(token, request) });
  } catch (error) { return failure(error); }
}

export async function logout(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await getSession(request.headers);
    if (session) await getDb().delete(sessions).where(eq(sessions.id, session.sessionId));
    return json({ success: true }, 200, { 'Set-Cookie': cookie('', request, true) });
  } catch (error) { return failure(error); }
}
