import type { D1Database } from '@cloudflare/workers-types';
import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url, platform, request }) => {
  const query = url.searchParams.get('query')?.trim();
  const lng = url.searchParams.get('lng');
  const lat = url.searchParams.get('lat');
  const limitRaw = url.searchParams.get('limit') ?? '5';

  const limit = Number(limitRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10) {
    throw error(400, 'limit must be an integer from 1 to 10');
  }
  if (query) {
    if (query.length < 2 || query.length > 200 || /[\u0000-\u001f\u007f]/.test(query)) {
      throw error(400, 'Invalid search query');
    }
  } else {
    const longitude = Number(lng);
    const latitude = Number(lat);
    if (lng === null || lat === null ||
      !Number.isFinite(longitude) || !Number.isFinite(latitude) ||
      longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
      throw error(400, 'Invalid coordinates');
    }
  }

  const db = (platform?.env as { DB?: D1Database } | undefined)?.DB;
  // Pages and the API Worker share the D1 binding configured in wrangler.toml.
  // Fail closed outside local development when the global limiter is unavailable.
  if (!db && !dev) throw error(503, 'Geocoding temporarily unavailable');
  if (db) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const now = Date.now();
    const windowMs = 60_000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    const row = await db.prepare(`
      INSERT INTO api_rate_limit_counters (bucket_key, window_start, hit_count)
      VALUES (?, ?, 1)
      ON CONFLICT(bucket_key) DO UPDATE SET
        hit_count = CASE WHEN window_start = excluded.window_start THEN hit_count + 1 ELSE 1 END,
        window_start = excluded.window_start
      RETURNING hit_count
    `).bind(`mapbox-geocode:${hash}`, windowStart).first<{ hit_count: number }>();
    if (Math.random() < 1 / 512) {
      await db.prepare('DELETE FROM api_rate_limit_counters WHERE window_start < ?')
        .bind(now - 24 * 60 * 60_000).run().catch(() => {});
    }
    if (!row || row.hit_count > 30) {
      const retryAfter = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));
      return json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Too many geocoding requests' } },
        { status: 429, headers: { 'Retry-After': String(retryAfter), 'Cache-Control': 'no-store' } },
      );
    }
  }

  const accessToken = env.MAPBOX_ACCESS_TOKEN;
  if (!accessToken) throw error(500, 'Mapbox token not configured');

  const location = query ? encodeURIComponent(query) : `${Number(lng)},${Number(lat)}`;
  const upstream = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${location}.json`);
  upstream.searchParams.set('access_token', accessToken);
  upstream.searchParams.set('limit', String(limit));
  upstream.searchParams.set('language', 'ja');

  const response = await fetch(upstream.toString());
  if (!response.ok) throw error(response.status, 'Mapbox API request failed');
  return json(await response.json(), {
    headers: { 'Cache-Control': 'public, max-age=30, s-maxage=60' },
  });
};
