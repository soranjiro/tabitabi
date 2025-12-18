import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import app from '../src/index';

async function applyMigrations(db: D1Database) {
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
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      location TEXT,
      notes TEXT,
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
      const { success, error } = await response.json() as any;
      expect(success).toBe(false);
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('returns empty array when no steps exist', async () => {
      const { id } = await createItinerary();

      const request = new Request(`http://localhost/api/v1/steps?itinerary_id=${id}`);
      const response = await app.fetch(request, env);

      expect(response.status).toBe(200);
      const { success, data } = await response.json() as any;
      expect(success).toBe(true);
      expect(data).toEqual([]);
    });

    it('returns steps sorted by date and time', async () => {
      const { id, token } = await createItinerary();

      const step1 = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itinerary_id: id,
          title: 'Dinner',
          date: '2024-01-01',
          time: '19:00',
        }),
      });
      await app.fetch(step1, env);

      const step2 = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itinerary_id: id,
          title: 'Breakfast',
          date: '2024-01-01',
          time: '08:00',
        }),
      });
      await app.fetch(step2, env);

      const request = new Request(`http://localhost/api/v1/steps?itinerary_id=${id}`);
      const response = await app.fetch(request, env);

      expect(response.status).toBe(200);
      const { data } = await response.json() as any;
      expect(data).toHaveLength(2);
      expect(data[0].title).toBe('Breakfast');
      expect(data[1].title).toBe('Dinner');
    });
  });

  describe('POST /api/v1/steps', () => {
    it('creates a new step with required fields', async () => {
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
          date: '2024-01-01',
          time: '10:00',
        }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(201);

      const { success, data } = await response.json() as any;
      expect(success).toBe(true);
      expect(data.title).toBe('Visit Museum');
      expect(data.date).toBe('2024-01-01');
      expect(data.time).toBe('10:00');
      expect(data.id).toBeDefined();
    });

    it('creates step with optional fields', async () => {
      const { id, token } = await createItinerary();

      const request = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itinerary_id: id,
          title: 'Lunch',
          date: '2024-01-01',
          time: '12:00',
          location: 'Tokyo Station',
          notes: '{"text":"Try the ramen shop"}',
        }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(201);

      const { data } = await response.json() as any;
      expect(data.location).toBe('Tokyo Station');
      expect(data.notes).toBe('{"text":"Try the ramen shop"}');
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
          title: 'Missing date and time',
        }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(400);
      const { error } = await response.json() as any;
      expect(error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 if not authenticated', async () => {
      const { id } = await createItinerary('Test Trip', 'password123');

      const request = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itinerary_id: id,
          title: 'No Auth',
          date: '2024-01-01',
          time: '10:00',
        }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(403);
    });

    it('returns 403 if trying to add step to another itinerary', async () => {
      const { id: id1 } = await createItinerary('Trip 1', 'password1');
      const { token: token2 } = await createItinerary('Trip 2', 'password2');

      const request = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token2}`,
        },
        body: JSON.stringify({
          itinerary_id: id1,
          title: 'Wrong Trip',
          date: '2024-01-01',
          time: '10:00',
        }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(403);
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
          date: '2024-01-01',
          time: '10:00',
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
      const { id, token } = await createItinerary('Test Trip', 'password123');

      const createRequest = new Request('http://localhost/api/v1/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          itinerary_id: id,
          title: 'Original',
          date: '2024-01-01',
          time: '10:00',
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
          location: 'New Location',
        }),
      });
      const response = await app.fetch(updateRequest, env);

      expect(response.status).toBe(200);
      const { data } = await response.json() as any;
      expect(data.title).toBe('Updated');
      expect(data.location).toBe('New Location');
    });

    it('returns 401 if not authenticated', async () => {
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
          date: '2024-01-01',
          time: '10:00',
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
          date: '2024-01-01',
          time: '10:00',
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

    it('returns 401 if not authenticated', async () => {
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
          date: '2024-01-01',
          time: '10:00',
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
