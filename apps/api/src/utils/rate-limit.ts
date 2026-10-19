/** D1-backed fixed-window limiter. UPSERT is atomic across Worker instances. */
export async function consumeRateLimit(
  db: D1Database,
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const row = await db.prepare(`
    INSERT INTO api_rate_limit_counters (bucket_key, window_start, hit_count)
    VALUES (?, ?, 1)
    ON CONFLICT(bucket_key) DO UPDATE SET
      hit_count = CASE
        WHEN window_start = excluded.window_start THEN hit_count + 1
        ELSE 1
      END,
      window_start = excluded.window_start
    RETURNING hit_count
  `).bind(key, windowStart).first<{ hit_count: number }>();
  // Expired buckets should not accumulate indefinitely. Cleanup runs rarely
  // and never makes a user request fail if maintenance encounters an error.
  if (Math.random() < 1 / 512) {
    await db.prepare('DELETE FROM api_rate_limit_counters WHERE window_start < ?')
      .bind(now - 24 * 60 * 60_000).run().catch(() => {});
  }
  const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000));
  return { allowed: Boolean(row && row.hit_count <= maxRequests), retryAfterSeconds };
}

export async function rateLimitIpKey(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
