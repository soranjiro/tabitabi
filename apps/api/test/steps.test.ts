import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';

async function applyMigrations(db: D1Database) {
  // Drop tables if they exist to ensure clean state
  await db.prepare('DROP TABLE IF EXISTS itinerary_walica_settings').run();
  await db.prepare('DROP TABLE IF EXISTS itinerary_secrets').run();
  await db.prepare('DROP TABLE IF EXISTS steps').run();
  await db.prepare('DROP TABLE IF EXISTS itineraries').run();

  const migrations = [
    `CREATE TABLE IF NOT EXISTS itineraries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      theme_id TEXT NOT NULL DEFAULT 'map-only',
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
    `CREATE INDEX IF NOT EXISTS idx_steps_start_at ON steps(itinerary_id, start_at);`,
    `CREATE INDEX IF NOT EXISTS idx_steps_end_at ON steps(itinerary_id, end_at);`,
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

async function createItinerary(title: string = 'Test Trip', password?: string): Promise<{ id: string; token: string }> {
  const request = new Request('http://localhost/api/v1/itineraries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, password }),
  });
  const response = await app.fetch(request, env);
  const { data } = await response.json() as any;
  return { id: data.id, token: data.token };
}

describe('Steps API', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM steps').run();
    await env.DB.prepare('DELETE FROM itinerary_secrets').run();
    await env.DB.prepare('DELETE FROM itinerary_walica_settings').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  describe('GET /api/v1/steps', () => {
    it('returns 400 if itinerary_id is missing', async () => {
      const request = new Request('http://localhost/api/v1/steps');
      const response = await app.fetch(request, env);

      expect(response.status).toBe(400);
      const { success } = await response.json() as any;
      expect(success).toBe(false);
    });

    it('returns empty array when no steps exist', async () => {
      const { id } = await createItinerary();

      const request = new Request(`http://localhost/api/v1/steps?itinerary_id=${id}`);
      const response = await app.fetch(request, env);

      expect(response.status).toBe(200);
      const { data } = await response.json() as any;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(0);
    });
  });

  describe('POST /api/v1/steps', () => {
    it('creates a new step with start_at timestamp', async () => {
      const { id, token } = await createItinerary();

      const request = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itinerary_id: id,
          title: 'Visit Museum',
          start_at: Date.now(),
        }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(201);

      const { data } = await response.json() as any;
      expect(data.title).toBe('Visit Museum');
      expect(data.start_at).toBeDefined();
      expect(typeof data.start_at).toBe('number');
      expect(data.end_at).toBeDefined();
      expect(typeof data.end_at).toBe('number');
      expect(data.id).toBeDefined();
    });

    it('returns 400 if required fields are missing', async () => {
      const { id, token } = await createItinerary();

      const request = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itinerary_id: id,
          title: 'Missing start_at',
        }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/steps/:stepId', () => {
    it('returns step by id', async () => {
      const { id, token } = await createItinerary('Test Trip', 'password123');

      const createRequest = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itinerary_id: id,
          title: 'My Step',
          start_at: Date.now(),
        }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as any;

      const request = new Request(`http://localhost/api/v1/steps/${created.id}`);
      const response = await app.fetch(request, env);

      expect(response.status).toBe(200);
      const { data } = await response.json() as any;
      expect(data.id).toBe(created.id);
      expect(data.title).toBe('My Step');
    });

    it('returns 404 for non-existent step', async () => {
      const request = new Request('http://localhost/api/v1/steps/nonexistent');
      const response = await app.fetch(request, env);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/steps/:stepId', () => {
    it('updates step fields', async () => {
      const { id, token } = await createItinerary();

      const createRequest = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itinerary_id: id,
          title: 'Original',
          start_at: Date.now(),
        }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as any;

      const updateRequest = new Request(`http://localhost/api/v1/steps/${created.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: 'Updated',
        }),
      });
      const response = await app.fetch(updateRequest, env);

      expect(response.status).toBe(200);
      const { data } = await response.json() as any;
      expect(data.title).toBe('Updated');
    });

    it('returns 403 if not authenticated', async () => {
      const { id, token } = await createItinerary('Test Trip', 'password123');

      const createRequest = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itinerary_id: id,
          title: 'Test',
          start_at: Date.now(),
        }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as any;

      const updateRequest = new Request(`http://localhost/api/v1/steps/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'No Auth' }),
      });
      const response = await app.fetch(updateRequest, env);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/steps/:stepId', () => {
    it('deletes step', async () => {
      const { id, token } = await createItinerary();

      const createRequest = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itinerary_id: id,
          title: 'To Delete',
          start_at: Date.now(),
        }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as any;

      const deleteRequest = new Request(`http://localhost/api/v1/steps/${created.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const response = await app.fetch(deleteRequest, env);

      expect(response.status).toBe(200);

      const getRequest = new Request(`http://localhost/api/v1/steps/${created.id}`);
      const getResponse = await app.fetch(getRequest, env);
      expect(getResponse.status).toBe(404);
    });

    it('returns 403 if not authenticated', async () => {
      const { id, token } = await createItinerary('Test Trip', 'password123');

      const createRequest = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itinerary_id: id,
          title: 'Test',
          start_at: Date.now(),
        }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as any;

      const deleteRequest = new Request(`http://localhost/api/v1/steps/${created.id}`, {
        method: 'DELETE',
      });
      const response = await app.fetch(deleteRequest, env);

      expect(response.status).toBe(403);
    });
  });
});
