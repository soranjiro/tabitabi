import { Hono } from 'hono';
import { Env } from '../utils';
import { ItineraryService } from '../services/itinerary.service';
import { generateToken, verifyToken, extractBearerToken } from '../utils/jwt';
import { verifyPassword } from '../utils/password';
import { z } from 'zod';
import { consumeRateLimit, rateLimitIpKey } from '../utils/rate-limit';

const auth = new Hono<{ Bindings: Env }>();

auth.post('/verify', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);

  if (!token) {
    return c.json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Token is required' }
    }, 400);
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' }
    }, 401);
  }

  return c.json({
    success: true,
    data: { shioriId: payload.shioriId, valid: true }
  });
});

auth.post('/password', async (c) => {
  const body = await c.req.text();
  if (body.length > 4096) {
    return c.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Request body too large' } }, 413);
  }
  let input: unknown;
  try { input = JSON.parse(body); } catch { input = null; }
  const parsed = z.object({
    shioriId: z.string().min(1).max(128),
    password: z.string().max(1024).optional(),
  }).safeParse(input);
  if (!parsed.success) {
    return c.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid password authentication request' } }, 400);
  }
  const { shioriId, password } = parsed.data;
  // Check both budgets before loading an itinerary or running expensive bcrypt.
  // Only CF-Connecting-IP is used: user supplied X-Forwarded-For is untrusted.
  const ip = await rateLimitIpKey(c.req.header('CF-Connecting-IP') || 'unknown');
  const globalBudget = await consumeRateLimit(c.env.DB, `auth-ip:${ip}`, 60, 10 * 60_000);
  const itineraryBudget = globalBudget.allowed
    ? await consumeRateLimit(c.env.DB, `auth-book:${ip}:${shioriId}`, 8, 10 * 60_000)
    : globalBudget;
  if (!globalBudget.allowed || !itineraryBudget.allowed) {
    c.header('Retry-After', String(Math.max(globalBudget.retryAfterSeconds, itineraryBudget.retryAfterSeconds)));
    return c.json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' } }, 429);
  }

  const service = new ItineraryService(c.env.DB);
  const itinerary = await service.get(shioriId);

  if (!itinerary) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Itinerary not found' }
    }, 404);
  }

  // 公開用スナップショットは常に閲覧専用です。パスワードが未設定でも
  // 編集用トークンを発行すると、クライアントが編集可能と誤認してしまいます。
  if (itinerary.source_itinerary_id) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Shared snapshots are view-only. Copy it to create your own editable itinerary.' }
    }, 403);
  }

  if (itinerary.password) {
    if (!password) {
      return c.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid password' }
      }, 401);
    }
    const isValid = await verifyPassword(password, itinerary.password);
    if (!isValid) {
      return c.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid password' }
      }, 401);
    }
  }

  const token = await generateToken(shioriId, c.env.JWT_SECRET);

  return c.json({
    success: true,
    data: { token }
  });
});

export default auth;
