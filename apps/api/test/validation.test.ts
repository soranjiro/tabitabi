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

function jsonPost(path: string, body: unknown, headers?: Record<string, string>) {
  return app.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }, env);
}

function jsonPut(path: string, body: unknown, headers?: Record<string, string>) {
  return app.request(path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  }, env);
}

async function registerAndGetToken(username: string, email: string): Promise<string> {
  const res = await jsonPost('/api/v1/users/register', { username, email, password: 'password123' });
  const json = await res.json() as { success: boolean; data: { token: string } };
  return json.data.token;
}

async function expectValidationError(res: Response, messageContains?: string) {
  expect(res.status).toBe(400);
  const json = await res.json() as any;
  expect(json.success).toBe(false);
  expect(json.error.code).toBe('VALIDATION_ERROR');
  if (messageContains) {
    expect(json.error.message).toContain(messageContains);
  }
}

// ── POST /users/register validation ────────────────────

describe('POST /api/v1/users/register — validation', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
  });

  it('rejects username shorter than 3 characters', async () => {
    const res = await jsonPost('/api/v1/users/register', {
      username: 'ab', email: 'test@example.com', password: 'password123',
    });
    await expectValidationError(res, 'username must be at least 3 characters');
  });

  it('rejects username longer than 20 characters', async () => {
    const res = await jsonPost('/api/v1/users/register', {
      username: 'a'.repeat(21), email: 'test@example.com', password: 'password123',
    });
    await expectValidationError(res, 'username must be at most 20 characters');
  });

  it('rejects username with special characters', async () => {
    const res = await jsonPost('/api/v1/users/register', {
      username: 'user@name!', email: 'test@example.com', password: 'password123',
    });
    await expectValidationError(res, 'alphanumeric');
  });

  it('accepts username with underscores', async () => {
    const res = await jsonPost('/api/v1/users/register', {
      username: 'user_name_1', email: 'test@example.com', password: 'password123',
    });
    expect(res.status).toBe(201);
  });

  it('rejects invalid email format', async () => {
    const res = await jsonPost('/api/v1/users/register', {
      username: 'testuser', email: 'not-an-email', password: 'password123',
    });
    await expectValidationError(res, 'email');
  });

  it('rejects password shorter than 8 characters', async () => {
    const res = await jsonPost('/api/v1/users/register', {
      username: 'testuser', email: 'test@example.com', password: 'short',
    });
    await expectValidationError(res, 'password must be at least 8 characters');
  });

  it('rejects empty body', async () => {
    const res = await jsonPost('/api/v1/users/register', {});
    await expectValidationError(res);
  });
});

// ── POST /users/login validation ───────────────────────

describe('POST /api/v1/users/login — validation', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
  });

  it('rejects invalid email format', async () => {
    const res = await jsonPost('/api/v1/users/login', {
      email: 'not-an-email', password: 'password123',
    });
    await expectValidationError(res, 'email');
  });

  it('rejects missing email', async () => {
    const res = await jsonPost('/api/v1/users/login', { password: 'password123' });
    await expectValidationError(res);
  });

  it('rejects missing password', async () => {
    const res = await jsonPost('/api/v1/users/login', { email: 'test@example.com' });
    await expectValidationError(res);
  });
});

// ── POST /itineraries validation ───────────────────────

describe('POST /api/v1/itineraries — validation', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM steps').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  it('rejects missing title', async () => {
    const res = await jsonPost('/api/v1/itineraries', {});
    await expectValidationError(res, 'title');
  });

  it('rejects empty title', async () => {
    const res = await jsonPost('/api/v1/itineraries', { title: '' });
    await expectValidationError(res, 'title');
  });

  it('rejects title longer than 100 characters', async () => {
    const res = await jsonPost('/api/v1/itineraries', { title: 'あ'.repeat(101) });
    await expectValidationError(res, 'title must be at most 100 characters');
  });

  it('accepts valid title at max length', async () => {
    const res = await jsonPost('/api/v1/itineraries', { title: 'a'.repeat(100) });
    expect(res.status).toBe(201);
  });
});

// ── PUT /itineraries/:id validation ────────────────────

describe('PUT /api/v1/itineraries/:id — validation', () => {
  let itineraryId: string;

  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM steps').run();
    await env.DB.prepare('DELETE FROM itineraries').run();

    const res = await jsonPost('/api/v1/itineraries', { title: 'テスト旅程' });
    const json = await res.json() as any;
    itineraryId = json.data.id;
  });

  it('rejects empty title', async () => {
    const res = await jsonPut(`/api/v1/itineraries/${itineraryId}`, { title: '' });
    await expectValidationError(res, 'title must not be empty');
  });

  it('rejects title longer than 100 characters', async () => {
    const res = await jsonPut(`/api/v1/itineraries/${itineraryId}`, { title: 'あ'.repeat(101) });
    await expectValidationError(res, 'title must be at most 100 characters');
  });

  it('accepts update without title (partial update)', async () => {
    const res = await jsonPut(`/api/v1/itineraries/${itineraryId}`, { theme_id: 'pixel-quest' });
    expect(res.status).toBe(200);
  });
});

// ── POST /users/me/sync-bookmarks validation ──────────

describe('POST /api/v1/users/me/sync-bookmarks — validation', () => {
  let token: string;

  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
    token = await registerAndGetToken('syncuser', 'sync@example.com');
  });

  it('rejects non-array itinerary_ids', async () => {
    const res = await jsonPost('/api/v1/users/me/sync-bookmarks', { itinerary_ids: 'not-array' }, {
      Authorization: `Bearer ${token}`,
    });
    await expectValidationError(res);
  });

  it('rejects more than 50 itinerary_ids', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `id-${i}`);
    const res = await jsonPost('/api/v1/users/me/sync-bookmarks', { itinerary_ids: ids }, {
      Authorization: `Bearer ${token}`,
    });
    await expectValidationError(res, 'max 50');
  });

  it('rejects empty string in itinerary_ids', async () => {
    const res = await jsonPost('/api/v1/users/me/sync-bookmarks', { itinerary_ids: ['valid', ''] }, {
      Authorization: `Bearer ${token}`,
    });
    await expectValidationError(res);
  });

  it('accepts empty array', async () => {
    const res = await jsonPost('/api/v1/users/me/sync-bookmarks', { itinerary_ids: [] }, {
      Authorization: `Bearer ${token}`,
    });
    expect(res.status).toBe(200);
  });
});
