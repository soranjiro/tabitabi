import { Context } from 'hono';
import { Env } from '../utils';

function matchOrigin(origin: string, allowed: string[]): boolean {
  for (const rule of allowed) {
    if (rule === '*') return true;
    if (rule.includes('*')) {
      const pattern = '^' + rule
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\\\*/g, '.*') + '$';
      const re = new RegExp(pattern);
      if (re.test(origin)) return true;
    } else if (rule === origin) {
      return true;
    }
  }
  return false;
}

export async function corsMiddleware(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  const origin = c.req.header('Origin') || '';
  const allowedOriginsEnv = c.env.ALLOWED_ORIGINS || '*';

  const allowedOrigins = allowedOriginsEnv === '*'
    ? ['*']
    : allowedOriginsEnv.split(',').map((o: string) => o.trim()).filter(Boolean);

  let allowedOrigin = '*';
  if (origin && allowedOrigins[0] !== '*') {
    if (matchOrigin(origin, allowedOrigins)) {
      allowedOrigin = origin;
    } else {
      // Not allowed origin: log details for troubleshooting
      try {
        const url = new URL(c.req.url);
        console.warn('[CORS_BLOCK]', JSON.stringify({
          method: c.req.method,
          path: url.pathname,
          origin,
          allowedOrigins,
          timestamp: new Date().toISOString(),
        }));
      } catch (_) {
        console.warn('[CORS_BLOCK]', JSON.stringify({
          method: c.req.method,
          origin,
          allowedOrigins,
          timestamp: new Date().toISOString(),
        }));
      }
      if (c.req.method === 'OPTIONS') {
        return c.text('Forbidden', 403);
      }
      await next();
      return;
    }
  }

  const reqAllowedHeaders = c.req.header('Access-Control-Request-Headers');

  c.header('Access-Control-Allow-Origin', allowedOrigin);
  c.header('Vary', 'Origin, Access-Control-Request-Headers');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  c.header('Access-Control-Allow-Headers', reqAllowedHeaders || 'Content-Type, Authorization');
  c.header('Access-Control-Max-Age', '86400');

  if (c.req.method === 'OPTIONS') {
    // Hono のコンテキスト経由で返すことで設定したヘッダーを維持
    return c.body(null, 204);
  }

  await next();
}
