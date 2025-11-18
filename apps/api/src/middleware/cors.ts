import { Context } from 'hono';
import { Env } from '../utils';

export async function corsMiddleware(c: Context<{ Bindings: Env }>, next: () => Promise<void>) {
  const origin = c.req.header('Origin');
  const allowedOriginsEnv = c.env.ALLOWED_ORIGINS || '*';

  // 許可されたオリジンのリストを取得
  const allowedOrigins = allowedOriginsEnv === '*'
    ? ['*']
    : allowedOriginsEnv.split(',').map((o: string) => o.trim());

  // オリジンが許可されているかチェック
  let allowedOrigin = '*';
  if (origin && allowedOrigins[0] !== '*') {
    if (allowedOrigins.includes(origin)) {
      allowedOrigin = origin;
    } else {
      // オリジンが許可されていない場合はCORSヘッダーを返さない
      if (c.req.method === 'OPTIONS') {
        return c.text('Forbidden', 403);
      }
      await next();
      return;
    }
  }

  c.header('Access-Control-Allow-Origin', allowedOrigin);
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Max-Age', '86400');

  if (c.req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  await next();
}
