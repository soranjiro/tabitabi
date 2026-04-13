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

describe('POST /api/v1/users/register', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
  });

  it('registers a new user and returns token', async () => {
    const res = await app.request('/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'newuser', email: 'new@example.com', password: 'password123' }),
    }, env);
    expect(res.status).toBe(201);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.token).toBeDefined();
    expect(json.data.user.username).toBe('newuser');
  });

  it('returns 400 when username is missing', async () => {
    const res = await app.request('/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    }, env);
    expect(res.status).toBe(400);
    const json = await res.json() as any;
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when email is missing', async () => {
    const res = await app.request('/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser', password: 'password123' }),
    }, env);
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await app.request('/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testuser', email: 'test@example.com' }),
    }, env);
    expect(res.status).toBe(400);
  });

  it('returns 409 for duplicate email', async () => {
    await app.request('/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user1', email: 'dup@example.com', password: 'password123' }),
    }, env);

    const res = await app.request('/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user2', email: 'dup@example.com', password: 'password123' }),
    }, env);
    expect(res.status).toBe(409);
    const json = await res.json() as any;
    expect(json.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('returns 409 for duplicate username', async () => {
    await app.request('/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dupname', email: 'first@example.com', password: 'password123' }),
    }, env);

    const res = await app.request('/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dupname', email: 'second@example.com', password: 'password123' }),
    }, env);
    expect(res.status).toBe(409);
    const json = await res.json() as any;
    expect(json.error.code).toBe('USERNAME_ALREADY_EXISTS');
  });
});

describe('POST /api/v1/users/login', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
  });

  it('logs in with correct credentials', async () => {
    await app.request('/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'loginuser', email: 'login@example.com', password: 'password123' }),
    }, env);

    const res = await app.request('/api/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@example.com', password: 'password123' }),
    }, env);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.token).toBeDefined();
    expect(json.data.user.username).toBe('loginuser');
  });

  it('returns 401 for wrong password', async () => {
    await app.request('/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'loginuser', email: 'login@example.com', password: 'password123' }),
    }, env);

    const res = await app.request('/api/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'login@example.com', password: 'wrongpassword' }),
    }, env);
    expect(res.status).toBe(401);
    const json = await res.json() as any;
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 for non-existent email', async () => {
    const res = await app.request('/api/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'password123' }),
    }, env);
    expect(res.status).toBe(401);
  });

  it('returns 400 when email is missing', async () => {
    const res = await app.request('/api/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'password123' }),
    }, env);
    expect(res.status).toBe(400);
    const json = await res.json() as any;
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when password is missing', async () => {
    const res = await app.request('/api/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com' }),
    }, env);
    expect(res.status).toBe(400);
  });
});

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

describe('GET /api/v1/users/me/bookmarks', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
    await env.DB.prepare('DELETE FROM steps').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/v1/users/me/bookmarks', {}, env);
    expect(res.status).toBe(401);
  });

  it('returns empty array when no bookmarks', async () => {
    const token = await registerAndGetToken('bmuser', 'bm@example.com');
    const res = await app.request('/api/v1/users/me/bookmarks', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.bookmarks).toEqual([]);
  });

  it('returns bookmarks with itinerary details', async () => {
    const token = await registerAndGetToken('bmuser2', 'bm2@example.com');
    const itineraryId = await createItinerary();

    await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary_ids: [itineraryId] }),
    }, env);

    const res = await app.request('/api/v1/users/me/bookmarks', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.data.bookmarks).toHaveLength(1);
    expect(json.data.bookmarks[0].itinerary_id).toBe(itineraryId);
    expect(json.data.bookmarks[0].title).toBe('テスト旅程');
  });

  it('excludes snapshot itineraries from bookmarks list', async () => {
    const token = await registerAndGetToken('bmuser3', 'bm3@example.com');
    const itineraryId = await createItinerary();

    // sync and publish (creates snapshot bookmark)
    await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary_ids: [itineraryId] }),
    }, env);
    await app.request(`/api/v1/users/me/bookmarks/${itineraryId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_visible: true }),
    }, env);

    // Verify snapshot was actually created in the DB
    const snapshot = await env.DB
      .prepare('SELECT id FROM itineraries WHERE source_itinerary_id = ?')
      .bind(itineraryId)
      .first<{ id: string }>();
    expect(snapshot).not.toBeNull();

    // Verify snapshot bookmark exists in DB
    const snapshotBookmark = await env.DB
      .prepare('SELECT * FROM user_bookmarks WHERE itinerary_id = ?')
      .bind(snapshot!.id)
      .first();
    expect(snapshotBookmark).not.toBeNull();

    // GET /me/bookmarks should only return the original, not the snapshot
    const res = await app.request('/api/v1/users/me/bookmarks', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    const json = await res.json() as any;
    expect(json.data.bookmarks).toHaveLength(1);
    expect(json.data.bookmarks[0].itinerary_id).toBe(itineraryId);
  });

  it('returns shared_itinerary_id and shared_updated_at for published bookmarks', async () => {
    const token = await registerAndGetToken('bmuser4', 'bm4@example.com');
    const itineraryId = await createItinerary();

    await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary_ids: [itineraryId] }),
    }, env);
    await app.request(`/api/v1/users/me/bookmarks/${itineraryId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_visible: true }),
    }, env);

    const res = await app.request('/api/v1/users/me/bookmarks', {
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    const json = await res.json() as any;
    const bookmark = json.data.bookmarks[0];
    expect(bookmark.shared_itinerary_id).toBeDefined();
    expect(bookmark.shared_itinerary_id).not.toBeNull();
    expect(bookmark.shared_updated_at).toBeDefined();
  });
});

describe('GET /api/v1/users/:username/profile', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM users').run();
  });

  it('returns user profile for existing user', async () => {
    await registerAndGetToken('profuser', 'prof@example.com');

    const res = await app.request('/api/v1/users/profuser/profile', {}, env);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.username).toBe('profuser');
    expect(json.data.created_at).toBeDefined();
  });

  it('returns 404 for non-existent user', async () => {
    const res = await app.request('/api/v1/users/nobody/profile', {}, env);
    expect(res.status).toBe(404);
    const json = await res.json() as any;
    expect(json.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/v1/users/:username/bookmarks', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
    await env.DB.prepare('DELETE FROM steps').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  it('returns 404 for non-existent user', async () => {
    const res = await app.request('/api/v1/users/nobody/bookmarks', {}, env);
    expect(res.status).toBe(404);
    const json = await res.json() as any;
    expect(json.error.code).toBe('NOT_FOUND');
  });

  it('returns empty bookmarks for user with no public bookmarks', async () => {
    await registerAndGetToken('emptyuser', 'empty@example.com');

    const res = await app.request('/api/v1/users/emptyuser/bookmarks', {}, env);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    expect(json.success).toBe(true);
    expect(json.data.username).toBe('emptyuser');
    expect(json.data.bookmarks).toEqual([]);
  });

  it('returns only visible snapshot bookmarks', async () => {
    const token = await registerAndGetToken('pubuser', 'pub@example.com');
    const id1 = await createItinerary();
    const id2 = await createItinerary();

    // sync both
    await app.request('/api/v1/users/me/sync-bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ itinerary_ids: [id1, id2] }),
    }, env);

    // make only id1 visible (triggers auto-publish)
    await app.request(`/api/v1/users/me/bookmarks/${id1}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_visible: true }),
    }, env);

    const res = await app.request('/api/v1/users/pubuser/bookmarks', {}, env);
    expect(res.status).toBe(200);
    const json = await res.json() as any;
    // Only the published snapshot of id1 should appear (id2 is not visible)
    expect(json.data.bookmarks).toHaveLength(1);
  });
});
