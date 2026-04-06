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
      fork_count INTEGER NOT NULL DEFAULT 0,
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
  ];

  for (const sql of migrations) {
    await db.prepare(sql).run();
  }
}

describe('Itineraries API', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM steps').run();
    await env.DB.prepare('DELETE FROM itinerary_secrets').run();
    await env.DB.prepare('DELETE FROM itinerary_walica_settings').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  describe('POST /api/v1/itineraries', () => {
    it('creates a new itinerary with title', async () => {
      const request = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Trip' }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(201);

      const { success, data } = await response.json() as any;
      expect(success).toBe(true);
      expect(data.title).toBe('Test Trip');
      expect(data.theme_id).toBe('standard-autumn');
      expect(data.id).toBeDefined();
      expect(data.token).toBeDefined();
    });

    it('creates itinerary with custom theme', async () => {
      const request = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Custom Theme Trip', theme_id: 'standard' }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(201);

      const { data } = await response.json() as any;
      expect(data.theme_id).toBe('standard');
    });

    it('creates itinerary with memo', async () => {
      const request = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Trip with Memo', memo: '{"text":"Remember to pack sunscreen"}' }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(201);

      const { data } = await response.json() as any;
      expect(data.memo).toBe('{"text":"Remember to pack sunscreen"}');
    });
  });

  describe('GET /api/v1/itineraries', () => {
    it('returns empty array when no itineraries exist', async () => {
      const request = new Request('http://localhost/api/v1/itineraries');
      const response = await app.fetch(request, env);

      expect(response.status).toBe(200);
      const { success, data } = await response.json() as any;
      expect(success).toBe(true);
      expect(data).toEqual([]);
    });

    it('returns list of itineraries', async () => {
      const createRequest = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Trip 1' }),
      });
      await app.fetch(createRequest, env);

      const createRequest2 = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Trip 2' }),
      });
      await app.fetch(createRequest2, env);

      const request = new Request('http://localhost/api/v1/itineraries');
      const response = await app.fetch(request, env);

      expect(response.status).toBe(200);
      const { data } = await response.json() as any;
      expect(data).toHaveLength(2);
    });
  });

  describe('GET /api/v1/itineraries/:id', () => {
    it('returns itinerary by id', async () => {
      const createRequest = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'My Trip' }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as any;

      const request = new Request(`http://localhost/api/v1/itineraries/${created.id}`);
      const response = await app.fetch(request, env);

      expect(response.status).toBe(200);
      const { data } = await response.json() as any;
      expect(data.id).toBe(created.id);
      expect(data.title).toBe('My Trip');
    });

    it('returns 404 for non-existent itinerary', async () => {
      const request = new Request('http://localhost/api/v1/itineraries/nonexistent');
      const response = await app.fetch(request, env);

      expect(response.status).toBe(404);
      const { success, error } = await response.json() as any;
      expect(success).toBe(false);
      expect(error.code).toBe('NOT_FOUND');
    });
  });

  describe('PUT /api/v1/itineraries/:id', () => {
    it('updates itinerary title without password protection', async () => {
      const createRequest = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Original Title' }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as any;

      const updateRequest = new Request(`http://localhost/api/v1/itineraries/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      const response = await app.fetch(updateRequest, env);

      expect(response.status).toBe(200);
      const { data } = await response.json() as any;
      expect(data.title).toBe('Updated Title');
    });

    it('returns 404 for non-existent itinerary', async () => {
      const updateRequest = new Request('http://localhost/api/v1/itineraries/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      const response = await app.fetch(updateRequest, env);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/itineraries/:id', () => {
    it('deletes itinerary without password protection', async () => {
      const createRequest = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'To Delete' }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as any;

      const deleteRequest = new Request(`http://localhost/api/v1/itineraries/${created.id}`, {
        method: 'DELETE',
      });
      const response = await app.fetch(deleteRequest, env);

      expect(response.status).toBe(200);

      const getRequest = new Request(`http://localhost/api/v1/itineraries/${created.id}`);
      const getResponse = await app.fetch(getRequest, env);
      expect(getResponse.status).toBe(404);
    });

    it('returns 404 for non-existent itinerary', async () => {
      const deleteRequest = new Request('http://localhost/api/v1/itineraries/nonexistent', {
        method: 'DELETE',
      });
      const response = await app.fetch(deleteRequest, env);

      expect(response.status).toBe(404);
    });
  });
});

describe('POST /api/v1/itineraries/:id/fork', () => {
  async function applyForkMigrations(db: D1Database) {
    const migrations = [
      `CREATE TABLE IF NOT EXISTS itineraries (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        theme_id TEXT NOT NULL DEFAULT 'standard-autumn',
        memo TEXT,
        password TEXT,
        fork_count INTEGER NOT NULL DEFAULT 0,
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
    const json = await res.json() as { data: { token: string } };
    return json.data.token;
  }

  beforeEach(async () => {
    await applyForkMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM steps').run();
    await env.DB.prepare('DELETE FROM itinerary_secrets').run();
    await env.DB.prepare('DELETE FROM itinerary_walica_settings').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
    await env.DB.prepare('DELETE FROM users').run();
  });

  it('returns 401 without user auth token', async () => {
    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Original' }),
    }, env);
    const { data: created } = await createRes.json() as any;

    const res = await app.request(`/api/v1/itineraries/${created.id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, env);
    expect(res.status).toBe(401);
  });

  it('forks a public itinerary and returns new itinerary with token', async () => {
    const token = await registerAndGetToken('forkuser', 'forkuser@example.com');

    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '旅のしおり', theme_id: 'standard-autumn' }),
    }, env);
    const { data: source } = await createRes.json() as any;

    const res = await app.request(`/api/v1/itineraries/${source.id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(201);
    const json = await res.json() as { success: boolean; data: { id: string; title: string; theme_id: string; token: string } };
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('旅のしおり（コピー）');
    expect(json.data.theme_id).toBe('standard-autumn');
    expect(json.data.token).toBeTruthy();
    expect(json.data.id).not.toBe(source.id);
  });

  it('increments fork_count on the source itinerary', async () => {
    const token = await registerAndGetToken('forkuser2', 'forkuser2@example.com');

    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'カウントテスト' }),
    }, env);
    const { data: source } = await createRes.json() as any;

    await app.request(`/api/v1/itineraries/${source.id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }, env);

    const row = await env.DB.prepare('SELECT fork_count FROM itineraries WHERE id = ?').bind(source.id).first() as any;
    expect(row.fork_count).toBe(1);
  });

  it('copies steps from the source itinerary', async () => {
    const token = await registerAndGetToken('forkuser3', 'forkuser3@example.com');

    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'ステップ付き' }),
    }, env);
    const { data: source } = await createRes.json() as any;

    await app.request('/api/v1/steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itinerary_id: source.id, title: 'ステップ1', start_at: 1700000000000, end_at: 1700003600000 }),
    }, env);

    const forkRes = await app.request(`/api/v1/itineraries/${source.id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }, env);
    const { data: forked } = await forkRes.json() as any;

    const stepsRes = await app.request(`/api/v1/steps?itinerary_id=${forked.id}`, {}, env);
    const stepsJson = await stepsRes.json() as any;
    expect(stepsJson.data).toHaveLength(1);
    expect(stepsJson.data[0].title).toBe('ステップ1');
    expect(stepsJson.data[0].itinerary_id).toBe(forked.id);
  });

  it('returns 403 for password-protected itinerary', async () => {
    const token = await registerAndGetToken('forkuser4', 'forkuser4@example.com');

    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '秘密のしおり', password: 'secret123' }),
    }, env);
    const { data: source } = await createRes.json() as any;

    const res = await app.request(`/api/v1/itineraries/${source.id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(403);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 for non-existent itinerary', async () => {
    const token = await registerAndGetToken('forkuser5', 'forkuser5@example.com');

    const res = await app.request('/api/v1/itineraries/nonexistent-id/fork', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(404);
  });
});
