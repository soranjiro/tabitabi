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
      is_visible INTEGER NOT NULL DEFAULT 1,
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

async function registerAndLogin(username: string, email: string): Promise<string> {
  const res = await app.fetch(
    new Request('http://localhost/api/v1/users/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password: 'password123' }),
    }),
    env,
  );
  const { data } = await res.json() as { data: { token: string } };
  return data.token;
}

async function createItinerary(): Promise<string> {
  const res = await app.fetch(
    new Request('http://localhost/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Trip' }),
    }),
    env,
  );
  const { data } = await res.json() as { data: { id: string } };
  return data.id;
}

describe('GET /api/v1/users/me/bookmarks/:itineraryId', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  it('returns bookmark when user owns the itinerary', async () => {
    const token = await registerAndLogin('testuser', 'test@example.com');
    const itineraryId = await createItinerary();

    // ブックマークを手動で追加
    const now = new Date().toISOString();
    const userRow = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
      .bind('test@example.com')
      .first<{ id: string }>();
    await env.DB.prepare(
      'INSERT INTO user_bookmarks (user_id, itinerary_id, is_visible, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
    ).bind(userRow!.id, itineraryId, now, now).run();

    const res = await app.fetch(
      new Request(`http://localhost/api/v1/users/me/bookmarks/${itineraryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      env,
    );

    expect(res.status).toBe(200);
    const { success, data } = await res.json() as { success: boolean; data: { itinerary_id: string } };
    expect(success).toBe(true);
    expect(data.itinerary_id).toBe(itineraryId);
  });

  it('returns 404 when user has no bookmark for the itinerary', async () => {
    const token = await registerAndLogin('testuser2', 'test2@example.com');
    const itineraryId = await createItinerary();

    const res = await app.fetch(
      new Request(`http://localhost/api/v1/users/me/bookmarks/${itineraryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      env,
    );

    expect(res.status).toBe(404);
    const { success } = await res.json() as { success: boolean };
    expect(success).toBe(false);
  });

  it('returns 401 when unauthenticated', async () => {
    const itineraryId = await createItinerary();

    const res = await app.fetch(
      new Request(`http://localhost/api/v1/users/me/bookmarks/${itineraryId}`),
      env,
    );

    expect(res.status).toBe(401);
  });
});
