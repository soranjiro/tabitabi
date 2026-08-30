import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import app from '../src/index';
import { insertVerifiedUser, installFirebaseCertMock } from './helpers/firebase-auth';

beforeAll(() => installFirebaseCertMock());

async function applyMigrations(db: D1Database) {
  const migrations = [
    `CREATE TABLE IF NOT EXISTS itineraries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      theme_id TEXT NOT NULL DEFAULT 'standard-autumn',
      palette_id TEXT NOT NULL DEFAULT 'sakura',
      default_view_mode TEXT NOT NULL DEFAULT 'dayCard',
      packing_enabled INTEGER NOT NULL DEFAULT 1,
      prefecture_slugs TEXT NOT NULL DEFAULT '[]',
      areas TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      metadata_initialized INTEGER NOT NULL DEFAULT 0,
      memo TEXT,
      password TEXT,
      source_itinerary_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_itineraries_source_id ON itineraries(source_itinerary_id) WHERE source_itinerary_id IS NOT NULL;`,
    `CREATE TABLE IF NOT EXISTS steps (
      id TEXT PRIMARY KEY,
      itinerary_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start_at INTEGER NOT NULL,
      end_at INTEGER NOT NULL,
      location TEXT,
      notes TEXT,
      link TEXT,
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
    `CREATE TABLE IF NOT EXISTS itinerary_money_settings (
      itinerary_id TEXT PRIMARY KEY,
      budget_amount INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS itinerary_fork_stats (
      itinerary_id TEXT PRIMARY KEY,
      fork_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      prefecture TEXT,
      email_verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS user_bookmarks (
      user_id TEXT NOT NULL,
      itinerary_id TEXT NOT NULL,
      is_visible BOOLEAN NOT NULL DEFAULT 1,
      prefecture_slugs TEXT NOT NULL DEFAULT '[]',
      areas TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, itinerary_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS itinerary_publications (
      source_itinerary_id TEXT NOT NULL,
      shared_itinerary_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      prefecture_slugs TEXT NOT NULL,
      areas TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      published_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (source_itinerary_id, user_id)
    );`,
    `CREATE TABLE IF NOT EXISTS itinerary_members (
      id TEXT PRIMARY KEY,
      itinerary_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    );`,
  ];
  for (const sql of migrations) {
    await db.prepare(sql).run();
  }
}

async function registerAndGetToken(username: string, email: string): Promise<string> {
  return (await insertVerifiedUser(env.DB, username, email)).token;
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
    await env.DB.prepare('DELETE FROM itinerary_members').run();
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

  it('does not sync public snapshots', async () => {
    const token = await registerAndGetToken('snapshotviewer', 'snapshotviewer@example.com');
    const sourceId = await createItinerary();
    await env.DB.prepare(`
      INSERT INTO itineraries (id, title, theme_id, default_view_mode, source_itinerary_id, created_at, updated_at)
      VALUES (?, '公開しおり', 'standard-autumn', 'dayCard', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind('public-snapshot-id', sourceId).run();

    const res = await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary_ids: ['public-snapshot-id'] }),
    }, env);

    expect(res.status).toBe(200);
    const json = await res.json() as { data: { synced: number; skipped: number } };
    expect(json.data).toEqual({ synced: 0, skipped: 1 });
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
    await env.DB.prepare('DELETE FROM itinerary_members').run();
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

describe('owner publication flow', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM itinerary_publications').run();
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
    await env.DB.prepare('DELETE FROM steps').run();
    await env.DB.prepare('DELETE FROM itinerary_members').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  it('creates a snapshot and stores discovery metadata', async () => {
    const token = await registerAndGetToken('visuser', 'vis@example.com');
    const itineraryId = await createItinerary();

    // sync bookmark first
    await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary_ids: [itineraryId] }),
    }, env);

    const res = await app.request(`/api/v1/users/me/bookmarks/${itineraryId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prefecture_slugs: ['tokyo'], areas: ['浅草'], tags: ['グルメ'] }),
    }, env);
    expect(res.status).toBe(200);

    // verify snapshot was created
    const snapshot = await env.DB
      .prepare('SELECT id FROM itineraries WHERE source_itinerary_id = ?')
      .bind(itineraryId)
      .first<{ id: string }>();
    expect(snapshot).not.toBeNull();

    const publication = await env.DB
      .prepare('SELECT shared_itinerary_id, prefecture_slugs FROM itinerary_publications WHERE source_itinerary_id = ?')
      .bind(itineraryId)
      .first<{ shared_itinerary_id: string; prefecture_slugs: string }>();
    expect(publication?.shared_itinerary_id).toBe(snapshot!.id);
    expect(JSON.parse(publication!.prefecture_slugs)).toEqual(['tokyo']);
  });

  it('does not create a snapshot when the itinerary is not saved by the account', async () => {
    const token = await registerAndGetToken('notowner', 'notowner@example.com');
    const itineraryId = await createItinerary();

    const res = await app.request(`/api/v1/users/me/bookmarks/${itineraryId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prefecture_slugs: ['tokyo'] }),
    }, env);

    expect(res.status).toBe(404);
    const snapshot = await env.DB.prepare(
      'SELECT id FROM itineraries WHERE source_itinerary_id = ?',
    ).bind(itineraryId).first();
    expect(snapshot).toBeNull();
  });

  it('reuses one public ID when multiple accounts publish the same itinerary', async () => {
    const firstToken = await registerAndGetToken('firstpublisher', 'first@example.com');
    const secondToken = await registerAndGetToken('secondpublisher', 'second@example.com');
    const itineraryId = await createItinerary();

    for (const token of [firstToken, secondToken]) {
      const syncRes = await app.request('/api/v1/users/me/sync-bookmarks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ itinerary_ids: [itineraryId] }),
      }, env);
      expect(syncRes.status).toBe(200);
    }

    const publish = (token: string, prefecture: string) => app.request(
      `/api/v1/users/me/bookmarks/${itineraryId}/publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prefecture_slugs: [prefecture] }),
      },
      env,
    );

    const firstRes = await publish(firstToken, 'tokyo');
    const secondRes = await publish(secondToken, 'kyoto');
    expect(firstRes.status).toBe(200);
    expect(secondRes.status).toBe(200);

    const first = await firstRes.json() as { data: { id: string } };
    const second = await secondRes.json() as { data: { id: string } };
    expect(second.data.id).toBe(first.data.id);

    const publications = await env.DB.prepare(`
      SELECT shared_itinerary_id, user_id
      FROM itinerary_publications
      WHERE source_itinerary_id = ?
      ORDER BY user_id
    `).bind(itineraryId).all<{ shared_itinerary_id: string; user_id: string }>();
    expect(publications.results).toHaveLength(2);
    expect(publications.results?.every((row) => row.shared_itinerary_id === first.data.id)).toBe(true);
  });

  it('removes the listing but keeps the public-ID snapshot when unpublished', async () => {
    const token = await registerAndGetToken('hideuser', 'hide@example.com');
    const itineraryId = await createItinerary();

    // sync and publish
    await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary_ids: [itineraryId] }),
    }, env);
    await app.request(`/api/v1/users/me/bookmarks/${itineraryId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prefecture_slugs: ['kyoto'] }),
    }, env);

    const res = await app.request(`/api/v1/users/me/bookmarks/${itineraryId}/publication`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(200);

    const snapshot = await env.DB
      .prepare('SELECT id FROM itineraries WHERE source_itinerary_id = ?')
      .bind(itineraryId)
      .first<{ id: string }>();
    expect(snapshot).not.toBeNull();
    const publication = await env.DB
      .prepare('SELECT 1 FROM itinerary_publications WHERE source_itinerary_id = ?')
      .bind(itineraryId)
      .first();
    expect(publication).toBeNull();
  });

  it('unlinks a non-published itinerary without deleting it', async () => {
    const token = await registerAndGetToken('unlinkuser', 'unlink@example.com');
    const itineraryId = await createItinerary();
    await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary_ids: [itineraryId] }),
    }, env);

    const res = await app.request(`/api/v1/users/me/bookmarks/${itineraryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(200);
    expect(await env.DB.prepare('SELECT 1 FROM itineraries WHERE id = ?').bind(itineraryId).first()).not.toBeNull();
    expect(await env.DB.prepare('SELECT 1 FROM user_bookmarks WHERE itinerary_id = ?').bind(itineraryId).first()).toBeNull();
  });

  it('does not unlink an itinerary while it is published', async () => {
    const token = await registerAndGetToken('publishedunlink', 'publishedunlink@example.com');
    const itineraryId = await createItinerary();
    await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary_ids: [itineraryId] }),
    }, env);
    await app.request(`/api/v1/users/me/bookmarks/${itineraryId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prefecture_slugs: ['tokyo'] }),
    }, env);

    const res = await app.request(`/api/v1/users/me/bookmarks/${itineraryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(409);
    expect(await env.DB.prepare('SELECT 1 FROM user_bookmarks WHERE itinerary_id = ?').bind(itineraryId).first()).not.toBeNull();
  });

  it('creates a password-free snapshot for a password-protected source', async () => {
    const token = await registerAndGetToken('pwuser', 'pw@example.com');

    // create password-protected itinerary
    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: '鍵付きしおり', password: 'secret123' }),
    }, env);
    const createJson = await createRes.json() as { data: { id: string } };
    const itineraryId = createJson.data.id;

    const res = await app.request(`/api/v1/users/me/bookmarks/${itineraryId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ prefecture_slugs: ['hokkaido'] }),
    }, env);
    expect(res.status).toBe(200);

    // verify snapshot was created (even for password-protected itinerary)
    const snapshot = await env.DB
      .prepare('SELECT id, password FROM itineraries WHERE source_itinerary_id = ?')
      .bind(itineraryId)
      .first<{ id: string; password: string | null }>();
    expect(snapshot).not.toBeNull();
    expect(snapshot!.password).toBeNull(); // snapshot has no password
  });
});
