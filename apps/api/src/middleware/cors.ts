import { Context } from 'hono';
import { Env } from '../utils';

export async function corsMiddleware(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  const allowedOrigins = c.env.ALLOWED_ORIGINS || '*';

  c.header('Access-Control-Allow-Origin', allowedOrigins);
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }

  await next();
}
