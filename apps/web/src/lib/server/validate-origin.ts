import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

/**
 * Origin / Referer ヘッダーを検証し、許可されていないリクエストを拒否する。
 * ALLOWED_ORIGINS 環境変数（カンマ区切り）で許可オリジンを指定可能。
 * 未設定の場合はリクエストの Host ヘッダーから自オリジンを推定して比較する。
 */
export function validateOrigin(request: Request): void {
  if (dev) return;

  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  const requestOrigin = origin ?? (referer ? new URL(referer).origin : null);

  if (!requestOrigin) {
    throw error(403, 'Forbidden');
  }

  const allowed = env.ALLOWED_ORIGINS;
  if (allowed) {
    const allowedList = allowed.split(',').map(o => o.trim());
    if (allowedList.includes(requestOrigin)) return;
    throw error(403, 'Forbidden');
  }

  // Fallback: 自オリジンとの比較
  const host = request.headers.get('host');
  if (!host) {
    throw error(403, 'Forbidden');
  }

  const protocol = request.headers.get('x-forwarded-proto') ?? 'https';
  const selfOrigin = `${protocol}://${host}`;

  if (requestOrigin !== selfOrigin) {
    throw error(403, 'Forbidden');
  }
}
