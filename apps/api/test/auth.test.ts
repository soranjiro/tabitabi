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

describe('Password Authentication', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM steps').run();
    await env.DB.prepare('DELETE FROM itinerary_secrets').run();
    await env.DB.prepare('DELETE FROM itinerary_walica_settings').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  describe('Itinerary with password', () => {
    it('creates itinerary with hashed password', async () => {
      const request = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Protected Trip', password: 'secret123' }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(201);

      const { success, data } = await response.json() as { success: boolean; data: { id: string; is_password_protected: boolean } };
      expect(success).toBe(true);
      expect(data.is_password_protected).toBe(true);

      const dbResult = await env.DB.prepare('SELECT password FROM itineraries WHERE id = ?').bind(data.id).first() as { password: string } | null;
      expect(dbResult).not.toBeNull();
      expect(dbResult!.password).not.toBe('secret123');
      expect(dbResult!.password).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
    });
  });

  describe('POST /api/v1/auth/password', () => {
    it('authenticates with correct password', async () => {
      const createRequest = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Protected Trip', password: 'secret123' }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as { data: { id: string } };

      const authRequest = new Request('http://localhost/api/v1/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shioriId: created.id, password: 'secret123' }),
      });
      const response = await app.fetch(authRequest, env);

      expect(response.status).toBe(200);
      const { success, data } = await response.json() as { success: boolean; data: { token: string } };
      expect(success).toBe(true);
      expect(data.token).toBeDefined();
    });

    it('rejects authentication with incorrect password', async () => {
      const createRequest = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Protected Trip', password: 'secret123' }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as { data: { id: string } };

      const authRequest = new Request('http://localhost/api/v1/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shioriId: created.id, password: 'wrongpassword' }),
      });
      const response = await app.fetch(authRequest, env);

      expect(response.status).toBe(401);
      const { success, error } = await response.json() as { success: boolean; error: { code: string } };
      expect(success).toBe(false);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('allows access to itinerary without password', async () => {
      const createRequest = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Public Trip' }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as { data: { id: string } };

      const authRequest = new Request('http://localhost/api/v1/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shioriId: created.id }),
      });
      const response = await app.fetch(authRequest, env);

      expect(response.status).toBe(200);
      const { success, data } = await response.json() as { success: boolean; data: { token: string } };
      expect(success).toBe(true);
      expect(data.token).toBeDefined();
    });

    it('returns 404 for non-existent itinerary', async () => {
      const authRequest = new Request('http://localhost/api/v1/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shioriId: 'nonexistent', password: 'secret' }),
      });
      const response = await app.fetch(authRequest, env);

      expect(response.status).toBe(404);
      const { success, error } = await response.json() as { success: boolean; error: { code: string } };
      expect(success).toBe(false);
      expect(error.code).toBe('NOT_FOUND');
    });
  });
});
