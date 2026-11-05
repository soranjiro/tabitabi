import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index';
import { rateLimitIpKey } from '../src/utils/rate-limit';

describe('Zero-trust API response hardening', () => {
  it('prevents caches from storing both anonymous and unauthorized API responses', async () => {
    const publicResponse = await app.request('/api/v1/passkeys/availability', {}, env);
    expect(publicResponse.status).toBe(200);
    expect(publicResponse.headers.get('Cache-Control')).toBe('private, no-store');
    expect(publicResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(publicResponse.headers.get('Referrer-Policy')).toBe('no-referrer');

    const denied = await app.request('/api/v1/auth/verify', { method: 'POST' }, env);
    expect(denied.status).toBe(400);
    expect(denied.headers.get('Cache-Control')).toBe('private, no-store');

    // The public health check is not an API credential-bearing response.
    const health = await app.request('/health', {}, env);
    expect(health.status).toBe(200);
    expect(health.headers.get('Cache-Control')).toBeNull();
  });
});

describe('Anonymous read limits', () => {
  beforeEach(async () => {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS api_rate_limit_counters (
        bucket_key TEXT PRIMARY KEY,
        window_start INTEGER NOT NULL,
        hit_count INTEGER NOT NULL DEFAULT 0
      )
    `).run();
  });

  it('rejects excessive public user searches before querying the users table', async () => {
    const ip = '198.51.100.89';
    const hash = await rateLimitIpKey(ip);
    const minuteStart = Math.floor(Date.now() / 60_000) * 60_000;
    const key = `public-read:/api/v1/users/search:${hash}`;
    await env.DB.prepare(`
      INSERT INTO api_rate_limit_counters (bucket_key, window_start, hit_count)
      VALUES (?, ?, 120)
      ON CONFLICT(bucket_key) DO UPDATE SET window_start = excluded.window_start, hit_count = excluded.hit_count
    `).bind(key, minuteStart).run();

    const response = await app.request('/api/v1/users/search?q=example', {
      headers: { 'CF-Connecting-IP': ip },
    }, env);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect((await response.json() as any).error.code).toBe('RATE_LIMITED');
  });

  it('limits itinerary listings independently of user search', async () => {
    const ip = '198.51.100.90';
    const hash = await rateLimitIpKey(ip);
    const minuteStart = Math.floor(Date.now() / 60_000) * 60_000;
    await env.DB.prepare(`
      INSERT INTO api_rate_limit_counters (bucket_key, window_start, hit_count)
      VALUES (?, ?, 60)
      ON CONFLICT(bucket_key) DO UPDATE SET window_start = excluded.window_start, hit_count = excluded.hit_count
    `).bind(`public-read:/api/v1/itineraries:${hash}`, minuteStart).run();

    const response = await app.request('/api/v1/itineraries', {
      headers: { 'CF-Connecting-IP': ip },
    }, env);
    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBeTruthy();
  });
});
