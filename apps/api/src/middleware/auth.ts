import type { Context, Next } from 'hono';
import { Env } from '../utils';
import { verifyToken, extractBearerToken } from '../utils/jwt';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
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

export async function optionalAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
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
