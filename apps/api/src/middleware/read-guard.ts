import type { Context, Next } from 'hono';
import type { Env } from '../utils';
import { consumeRateLimit, rateLimitIpKey } from '../utils/rate-limit';

// Public discovery endpoints need anti-enumeration limits even though they
// intentionally allow anonymous reads. Avoid a DB write for every static or
// per-itinerary read by restricting this guard to high-cardinality listings.
const PUBLIC_READ_BUDGETS: Record<string, { max: number; windowMs: number }> = {
  '/api/v1/users/search': { max: 120, windowMs: 60_000 },
  '/api/v1/users': { max: 120, windowMs: 60_000 },
  '/api/v1/itineraries': { max: 60, windowMs: 60_000 },
};

export async function protectPublicApiReads(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<Response | void> {
  if (c.req.method !== 'GET') return next();

  const budget = PUBLIC_READ_BUDGETS[c.req.path.replace(/\/$/, '')];
  if (!budget) return next();

  const clientIp = c.req.header('CF-Connecting-IP');
  // Match the write guard's behavior for local/unit tests without an edge IP.
  // Do not trust client-controlled X-Forwarded-For as an identity signal.
  if (!clientIp && c.env.ENVIRONMENT === 'test') return next();

  const ipHash = await rateLimitIpKey(clientIp || 'unknown');
  const result = await consumeRateLimit(
    c.env.DB,
    `public-read:${c.req.path.replace(/\/$/, '')}:${ipHash}`,
    budget.max,
    budget.windowMs,
  );
  if (!result.allowed) {
    c.header('Retry-After', String(result.retryAfterSeconds));
    return c.json({
      success: false,
      error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
    }, 429);
  }
  return next();
}
