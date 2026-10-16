import { Hono } from 'hono';
import { importPKCS8, SignJWT } from 'jose';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { userAuthMiddleware, userProfileMiddleware } from '../middleware/auth';
import { extractBearerToken } from '../utils/jwt';
import { verifyFirebaseIdToken } from '../utils/firebase-token';
import type { Env, Variables } from '../utils';

// Account passkeys are deliberately separate from itinerary editing tokens.
const passkeys = new Hono<{ Bindings: Env; Variables: Variables }>();
const CHALLENGE_SECONDS = 5 * 60;
const RECENT_LOGIN_SECONDS = 10 * 60;
const MAX_PASSKEYS = 10;

type Challenge = { challenge: string; user_id: string | null };
type StoredKey = {
  credential_id: string;
  user_id: string;
  public_key: string;
  counter: number;
  transports: string;
};
type PasskeySettings = { origin: string; rpID: string };

function settings(env: Env): PasskeySettings | null {
  // Never infer this from an untrusted Host/Origin header or CORS wildcard.
  if (!env.PASSKEY_ORIGIN || !env.PASSKEY_RP_ID || !env.FIREBASE_PROJECT_ID ||
      !env.FIREBASE_SERVICE_ACCOUNT_EMAIL || !env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY) return null;
  const origin = new URL(env.PASSKEY_ORIGIN);
  if (origin.origin !== env.PASSKEY_ORIGIN || (
    origin.protocol !== 'https:' && !(origin.protocol === 'http:' && origin.hostname === 'localhost')
  )) return null;
  if (origin.hostname !== env.PASSKEY_RP_ID && !origin.hostname.endsWith('.' + env.PASSKEY_RP_ID)) return null;
  return { origin: origin.origin, rpID: env.PASSKEY_RP_ID };
}

const invalid = (c: any, message = 'Invalid or expired passkey request') =>
  c.json({ success: false, error: { code: 'PASSKEY_INVALID', message } }, 400);
const unavailable = (c: any) =>
  c.json({ success: false, error: { code: 'PASSKEY_UNAVAILABLE', message: 'Passkey authentication is not configured' } }, 503);

function encode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function decode(value: string): Uint8Array {
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4)), c => c.charCodeAt(0));
}

async function freshUser(c: any): Promise<boolean> {
  const token = extractBearerToken(c.req.header('Authorization'));
  if (!token) return false;
  const payload = await verifyFirebaseIdToken(token, c.env.FIREBASE_PROJECT_ID);
  return Boolean(payload && payload.sub === c.get('userId') &&
    Math.floor(Date.now() / 1000) - payload.auth_time <= RECENT_LOGIN_SECONDS);
}

async function storeChallenge(
  c: any, action: 'register' | 'login', challenge: string, userId: string | null,
): Promise<string> {
  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  // Expired challenges are never accepted, and stale rows are removed opportunistically.
  await c.env.DB.prepare('DELETE FROM passkey_challenges WHERE expires_at <= ?').bind(now).run();
  if (action === 'register') {
    await c.env.DB.prepare("DELETE FROM passkey_challenges WHERE action = 'register' AND user_id = ?")
      .bind(userId).run();
  }
  await c.env.DB.prepare(
    'INSERT INTO passkey_challenges (id, action, user_id, challenge, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(id, action, userId, challenge, now + CHALLENGE_SECONDS, now).run();
  return id;
}

async function consumeChallenge(c: any, id: string, action: 'register' | 'login'): Promise<Challenge | null> {
  // Atomic consumption prevents challenge replay, including concurrent requests.
  return await c.env.DB.prepare(
    'DELETE FROM passkey_challenges WHERE id = ? AND action = ? AND expires_at > ? RETURNING challenge, user_id',
  ).bind(id, action, Math.floor(Date.now() / 1000)).first<Challenge>();
}

async function body(c: any): Promise<{ challengeId: string; response: Record<string, unknown> } | null> {
  const size = Number(c.req.header('Content-Length') || 0);
  if (size > 32768) return null;
  try {
    const value = await c.req.json();
    if (!value || typeof value !== 'object' ||
        typeof value.challengeId !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(value.challengeId) ||
        !value.response || typeof value.response !== 'object' ||
        typeof value.response.id !== 'string' || value.response.id.length > 2048) return null;
    return value;
  } catch {
    return null;
  }
}

async function customToken(env: Env, uid: string): Promise<string> {
  if (!env.FIREBASE_SERVICE_ACCOUNT_EMAIL || !env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY) {
    throw new Error('Firebase signing credentials are not configured');
  }
  const key = await importPKCS8(env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'), 'RS256');
  return new SignJWT({ uid })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(env.FIREBASE_SERVICE_ACCOUNT_EMAIL)
    .setSubject(env.FIREBASE_SERVICE_ACCOUNT_EMAIL)
    .setAudience('https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(key);
}

passkeys.use('*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
});

passkeys.get('/', userAuthMiddleware, userProfileMiddleware, async c => {
  const { results } = await c.env.DB.prepare(
    'SELECT credential_id AS id, created_at, last_used_at FROM user_passkeys WHERE user_id = ? ORDER BY created_at DESC',
  ).bind(c.get('userId')).all();
  return c.json({ success: true, data: { passkeys: results } });
});

passkeys.post('/register/options', userAuthMiddleware, userProfileMiddleware, async c => {
  const config = settings(c.env);
  if (!config) return unavailable(c);
  if (!await freshUser(c)) return c.json({ success: false, error: {
    code: 'RECENT_LOGIN_REQUIRED', message: 'Sign in again before adding a passkey',
  } }, 403);

  const { results } = await c.env.DB.prepare(
    'SELECT credential_id, transports FROM user_passkeys WHERE user_id = ?',
  ).bind(c.get('userId')).all<{ credential_id: string; transports: string }>();
  if (results.length >= MAX_PASSKEYS) return invalid(c, 'Maximum number of passkeys reached');
  const profile = await c.env.DB.prepare('SELECT username FROM users WHERE id = ?')
    .bind(c.get('userId')).first<{ username: string }>();
  if (!profile) return invalid(c);

  const options = await generateRegistrationOptions({
    rpName: 'たびたび',
    rpID: config.rpID,
    userName: profile.username,
    userDisplayName: profile.username,
    userID: new TextEncoder().encode(c.get('userId')!),
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'required', userVerification: 'required' },
    excludeCredentials: results.map(row => ({
      id: row.credential_id,
      transports: JSON.parse(row.transports),
    })),
  });
  const challengeId = await storeChallenge(c, 'register', options.challenge, c.get('userId')!);
  return c.json({ success: true, data: { challengeId, options } });
});

passkeys.post('/register/verify', userAuthMiddleware, userProfileMiddleware, async c => {
  const config = settings(c.env);
  if (!config) return unavailable(c);
  if (!await freshUser(c)) return c.json({ success: false, error: {
    code: 'RECENT_LOGIN_REQUIRED', message: 'Sign in again before adding a passkey',
  } }, 403);

  const input = await body(c);
  if (!input) return invalid(c);
  const pending = await consumeChallenge(c, input.challengeId, 'register');
  if (!pending || pending.user_id !== c.get('userId')) return invalid(c);
  try {
    const verified = await verifyRegistrationResponse({
      response: input.response as unknown as RegistrationResponseJSON,
      expectedChallenge: pending.challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      requireUserVerification: true,
    });
    if (!verified.verified || !verified.registrationInfo) return invalid(c);
    const credential = verified.registrationInfo.credential;
    const count = await c.env.DB.prepare(
      'SELECT COUNT(*) AS n FROM user_passkeys WHERE user_id = ?',
    ).bind(c.get('userId')).first<{ n: number }>();
    if ((count?.n ?? 0) >= MAX_PASSKEYS) return invalid(c);
    await c.env.DB.prepare(
      'INSERT INTO user_passkeys (credential_id, user_id, public_key, counter, transports, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(
      credential.id, c.get('userId'), encode(credential.publicKey), credential.counter,
      JSON.stringify(credential.transports ?? []), new Date().toISOString(),
    ).run();
    return c.json({ success: true, data: { id: credential.id } });
  } catch {
    return invalid(c);
  }
});

passkeys.post('/login/options', async c => {
  const config = settings(c.env);
  if (!config) return unavailable(c);
  // Discoverable credentials: do not ask for email or enumerate existing users.
  const options = await generateAuthenticationOptions({ rpID: config.rpID, userVerification: 'required' });
  const challengeId = await storeChallenge(c, 'login', options.challenge, null);
  return c.json({ success: true, data: { challengeId, options } });
});

passkeys.post('/login/verify', async c => {
  const config = settings(c.env);
  if (!config) return unavailable(c);
  const input = await body(c);
  if (!input) return invalid(c);
  const pending = await consumeChallenge(c, input.challengeId, 'login');
  if (!pending) return invalid(c);
  const response = input.response as unknown as AuthenticationResponseJSON;
  const stored = await c.env.DB.prepare(
    'SELECT credential_id, user_id, public_key, counter, transports FROM user_passkeys WHERE credential_id = ?',
  ).bind(response.id).first<StoredKey>();
  if (!stored) return invalid(c);

  // The credential is the identity. The optional userHandle must match its registered owner.
  if (response.response?.userHandle && response.response.userHandle !== encode(new TextEncoder().encode(stored.user_id))) {
    return invalid(c);
  }
  try {
    const verified = await verifyAuthenticationResponse({
      response,
      expectedChallenge: pending.challenge,
      expectedOrigin: config.origin,
      expectedRPID: config.rpID,
      credential: {
        id: stored.credential_id,
        publicKey: decode(stored.public_key),
        counter: stored.counter,
        transports: JSON.parse(stored.transports),
      },
      requireUserVerification: true,
    });
    if (!verified.verified) return invalid(c);
    // Only previously verified Firebase accounts may sign in via passkey.
    const profile = await c.env.DB.prepare(
      'SELECT id FROM users WHERE id = ? AND email_verified_at IS NOT NULL AND prefecture IS NOT NULL',
    ).bind(stored.user_id).first();
    if (!profile) return invalid(c);
    const changed = await c.env.DB.prepare(
      'UPDATE user_passkeys SET counter = ?, last_used_at = ? WHERE credential_id = ? AND counter = ?',
    ).bind(verified.authenticationInfo.newCounter, new Date().toISOString(), stored.credential_id, stored.counter).run();
    if (changed.meta.changes !== 1) return invalid(c);
    // Custom token is scoped to the existing UID; Firebase remains the only session issuer.
    const token = await customToken(c.env, stored.user_id);
    return c.json({ success: true, data: { token } });
  } catch {
    return invalid(c);
  }
});

passkeys.delete('/:id', userAuthMiddleware, userProfileMiddleware, async c => {
  if (!await freshUser(c)) return c.json({ success: false, error: {
    code: 'RECENT_LOGIN_REQUIRED', message: 'Sign in again before removing a passkey',
  } }, 403);
  const result = await c.env.DB.prepare(
    'DELETE FROM user_passkeys WHERE credential_id = ? AND user_id = ?',
  ).bind(c.req.param('id'), c.get('userId')).run();
  if (result.meta.changes !== 1) return c.json({ success: false, error: {
    code: 'NOT_FOUND', message: 'Passkey not found',
  } }, 404);
  return c.json({ success: true, data: { removed: true } });
});

export default passkeys;
