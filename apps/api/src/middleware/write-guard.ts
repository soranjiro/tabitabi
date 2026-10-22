import type { Context, Next } from 'hono';
import type { Env } from '../utils';
import { consumeRateLimit, rateLimitIpKey } from '../utils/rate-limit';

// Bound unauthenticated writes before JSON parsing, hashing or database work.
// These limits also apply when a client omits or falsifies Content-Length.
const MAX_WRITE_BYTES = 2 * 1024 * 1024;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function exceedsBodyLimit(request: Request): Promise<boolean> {
  const length = request.headers.get('Content-Length');
  if (length && Number(length) > MAX_WRITE_BYTES) return true;
  if (!request.body) return false;

  // Read from a clone so downstream route handlers can parse the original.
  // Abort as soon as the bound is crossed; never buffer the complete input.
  const reader = request.clone().body!.getReader();
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return false;
      bytes += value.byteLength;
      if (bytes > MAX_WRITE_BYTES) {
        void reader.cancel().catch(() => {});
        return true;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function protectApiWrites(
  c: Context<{ Bindings: Env }>,
  next: Next,
): Promise<Response | void> {
  if (!WRITE_METHODS.has(c.req.method)) return next();

  // Password verification is already guarded by stricter, account-specific
  // D1 budgets and has its own 4 KiB input limit.
  if (c.req.path === '/api/v1/auth/password') return next();

  const clientIp = c.req.header('CF-Connecting-IP');
  // Unit tests without a Cloudflare edge header share one test database.
  // Production never trusts client-supplied X-Forwarded-For for IP identity.
  if (clientIp || c.env.ENVIRONMENT !== 'test') {
    const ipHash = await rateLimitIpKey(clientIp || 'unknown');
    const budgets: Array<{ key: string; max: number; windowMs: number }> = [
      { key: `write-ip:${ipHash}`, max: 240, windowMs: 60_000 },
    ];

    if ((c.req.method === 'POST' && c.req.path === '/api/v1/itineraries')
      || (c.req.method === 'POST' && /^\/api\/v1\/itineraries\/[^/]+\/fork$/.test(c.req.path))) {
      budgets.push({ key: `write-create:${ipHash}`, max: 60, windowMs: 60 * 60_000 });
    }
    for (const budget of budgets) {
      const result = await consumeRateLimit(c.env.DB, budget.key, budget.max, budget.windowMs);
      if (!result.allowed) {
        c.header('Retry-After', String(result.retryAfterSeconds));
        return c.json({
          success: false,
          error: { code: 'RATE_LIMITED', message: 'Too many requests. Try again later.' },
        }, 429);
      }
    }
  }

  if (await exceedsBodyLimit(c.req.raw)) {
    return c.json({
      success: false,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds 2 MiB' },
    }, 413);
  }
  return next();
}
