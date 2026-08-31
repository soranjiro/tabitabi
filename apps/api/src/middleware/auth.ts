import type { Context, Next } from 'hono';
import { Env, Variables } from '../utils';
import { verifyToken, extractBearerToken } from '../utils/jwt';
import { verifyFirebaseIdToken } from '../utils/firebase-token';

async function resolveVerifiedUserId(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  firebaseUserId: string,
  email: string,
): Promise<string> {
  const normalizedEmail = email.toLowerCase();
  const existing = await c.env.DB.prepare(`
    SELECT id
    FROM users
    WHERE id = ? OR lower(email) = ?
    ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END
    LIMIT 1
  `).bind(firebaseUserId, normalizedEmail, firebaseUserId).first<{ id: string }>();

  return existing?.id ?? firebaseUserId;
}

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return c.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No token provided' }
    }, 401);
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
    }, 401);
  }

  c.set('shioriId', payload.shioriId);
  await next();
}

export async function optionalAuthMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  if (token) {
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    if (payload) {
      c.set('shioriId', payload.shioriId);
    }
  }

  await next();
}

export async function optionalUserAuthMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  if (token) {
    const payload = await verifyFirebaseIdToken(token, c.env.FIREBASE_PROJECT_ID);
    if (payload?.email_verified) {
      const userId = await resolveVerifiedUserId(c, payload.sub, payload.email);
      const profile = await c.env.DB.prepare('SELECT id FROM users WHERE id = ? AND email_verified_at IS NOT NULL AND prefecture IS NOT NULL')
        .bind(userId).first();
      if (profile) {
        c.set('userId', userId);
        c.set('firebaseEmail', payload.email.toLowerCase());
      }
    }
  }

  await next();
}

export async function userProfileMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const userId = c.get('userId');
  const profile = userId
    ? await c.env.DB.prepare('SELECT id FROM users WHERE id = ? AND email_verified_at IS NOT NULL AND prefecture IS NOT NULL').bind(userId).first()
    : null;
  if (!profile) {
    return c.json({
      success: false,
      error: { code: 'PROFILE_SETUP_REQUIRED', message: 'Profile setup is required' }
    }, 409);
  }
  await next();
}

export async function userAuthMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return c.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'No token provided' }
    }, 401);
  }

  const payload = await verifyFirebaseIdToken(token, c.env.FIREBASE_PROJECT_ID);

  if (!payload) {
    return c.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
    }, 401);
  }

  if (!payload.email_verified) {
    return c.json({
      success: false,
      error: { code: 'EMAIL_NOT_VERIFIED', message: 'Email address is not verified' }
    }, 403);
  }

  const userId = await resolveVerifiedUserId(c, payload.sub, payload.email);
  c.set('userId', userId);
  c.set('firebaseEmail', payload.email.toLowerCase());
  await next();
}
