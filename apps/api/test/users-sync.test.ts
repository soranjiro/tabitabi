import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';

async function applyMigrations(db: D1Database) {
  const migrations = [
    `CREATE TABLE IF NOT EXISTS itineraries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      theme_id TEXT NOT NULL DEFAULT 'standard-autumn',
      memo TEXT,
      password TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY,
      itinerary_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start_at INTEGER NOT NULL,
      end_at INTEGER NOT NULL,
      location TEXT,
      notes TEXT,
      type TEXT NOT NULL DEFAULT 'normal:general',
      is_all_day INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    );`,
    `CREATE INDEX IF NOT EXISTS idx_steps_itinerary ON steps(itinerary_id);`,
    `CREATE TABLE IF NOT EXISTS itinerary_secrets (
      itinerary_id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT FALSE,
      offset_minutes INTEGER DEFAULT 60,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS itinerary_walica_settings (
      itinerary_id TEXT PRIMARY KEY,
      walica_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS user_bookmarks (
      user_id TEXT NOT NULL,
      itinerary_id TEXT NOT NULL,
      is_visible BOOLEAN NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, itinerary_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    );`,
  ];
  for (const sql of migrations) {
    await db.prepare(sql).run();
  }
}

async function registerAndGetToken(username: string, email: string): Promise<string> {
  const res = await app.request('/api/v1/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password: 'password123' }),
  }, env);
  const json = await res.json() as { success: boolean; data: { token: string } };
  return json.data.token;
}

async function createItinerary(): Promise<string> {
  const res = await app.request('/api/v1/itineraries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'テスト旅程' }),
  }, env);
  const json = await res.json() as { success: boolean; data: { id: string } };
  return json.data.id;
}

describe('POST /api/v1/users/me/sync-bookmarks', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itinerary_ids: [] }),
    }, env);
    expect(res.status).toBe(401);
  });

  it('syncs valid itinerary IDs and returns correct counts', async () => {
    const token = await registerAndGetToken('testuser', 'test@example.com');
    const id1 = await createItinerary();
    const id2 = await createItinerary();

    const res = await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ itinerary_ids: [id1, id2] }),
    }, env);

    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; data: { synced: number; skipped: number } };
    expect(json.success).toBe(true);
    expect(json.data.synced).toBe(2);
    expect(json.data.skipped).toBe(0);
  });

  it('skips non-existent itinerary IDs', async () => {
    const token = await registerAndGetToken('testuser2', 'test2@example.com');

    const res = await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ itinerary_ids: ['nonexistent-id'] }),
    }, env);

    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; data: { synced: number; skipped: number } };
    expect(json.data.synced).toBe(0);
    expect(json.data.skipped).toBe(1);
  });

  it('skips already-bookmarked IDs on second call', async () => {
    const token = await registerAndGetToken('testuser3', 'test3@example.com');
    const id = await createItinerary();

    await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary_ids: [id] }),
    }, env);

    const res = await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary_ids: [id] }),
    }, env);

    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; data: { synced: number; skipped: number } };
    expect(json.data.synced).toBe(0);
    expect(json.data.skipped).toBe(1);
  });

  it('returns 400 for more than 50 IDs', async () => {
    const token = await registerAndGetToken('testuser4', 'test4@example.com');
    const ids = Array.from({ length: 51 }, (_, i) => `id-${i}`);

    const res = await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary_ids: ids }),
    }, env);

    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/itineraries with user token', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  it('creates user_bookmark record when creating itinerary while logged in', async () => {
    const token = await registerAndGetToken('creator', 'creator@example.com');

    const res = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title: 'マイ旅程' }),
    }, env);

    expect(res.status).toBe(201);
    const json = await res.json() as { success: boolean; data: { id: string } };
    const itineraryId = json.data.id;

    const bookmarks = await app.request('/api/v1/users/me/bookmarks', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    const bJson = await bookmarks.json() as { success: boolean; data: { bookmarks: { itinerary_id: string }[] } };
    expect(bJson.data.bookmarks.some(b => b.itinerary_id === itineraryId)).toBe(true);
  });

  it('creates itinerary normally without user token (no bookmark)', async () => {
    const res = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '匿名旅程' }),
    }, env);
    expect(res.status).toBe(201);
  });
});
