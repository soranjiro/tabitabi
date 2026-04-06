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

async function registerAndGetToken(username: string, email: string, password = 'password123'): Promise<string> {
  const res = await app.request('/api/v1/users/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  }, env);
  const json = await res.json() as { success: boolean; data: { token: string } };
  return json.data.token;
}

describe('PATCH /api/v1/users/me/profile', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
  });

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/v1/users/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'newname' }),
    }, env);
    expect(res.status).toBe(401);
  });

  it('updates username successfully', async () => {
    const token = await registerAndGetToken('oldname', 'user@example.com');

    const res = await app.request('/api/v1/users/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username: 'newname' }),
    }, env);

    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; data: { username: string; email: string } };
    expect(json.success).toBe(true);
    expect(json.data.username).toBe('newname');
    expect(json.data.email).toBe('user@example.com');
  });

  it('updates email successfully', async () => {
    const token = await registerAndGetToken('myuser', 'old@example.com');

    const res = await app.request('/api/v1/users/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'new@example.com' }),
    }, env);

    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; data: { username: string; email: string } };
    expect(json.data.email).toBe('new@example.com');
  });

  it('returns 400 when no fields provided', async () => {
    const token = await registerAndGetToken('user2', 'user2@example.com');

    const res = await app.request('/api/v1/users/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    }, env);

    expect(res.status).toBe(400);
  });

  it('returns 400 for username shorter than 3 chars', async () => {
    const token = await registerAndGetToken('user3', 'user3@example.com');

    const res = await app.request('/api/v1/users/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username: 'ab' }),
    }, env);

    expect(res.status).toBe(400);
    const json = await res.json() as { success: boolean; error: { code: string } };
    expect(json.error.code).toBe('USERNAME_INVALID_LENGTH');
  });

  it('returns 400 for invalid email format', async () => {
    const token = await registerAndGetToken('user4', 'user4@example.com');

    const res = await app.request('/api/v1/users/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'not-an-email' }),
    }, env);

    expect(res.status).toBe(400);
    const json = await res.json() as { success: boolean; error: { code: string } };
    expect(json.error.code).toBe('EMAIL_INVALID_FORMAT');
  });

  it('returns 409 for duplicate username', async () => {
    await registerAndGetToken('takenname', 'taken@example.com');
    const token = await registerAndGetToken('user5', 'user5@example.com');

    const res = await app.request('/api/v1/users/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username: 'takenname' }),
    }, env);

    expect(res.status).toBe(409);
    const json = await res.json() as { success: boolean; error: { code: string } };
    expect(json.error.code).toBe('USERNAME_ALREADY_EXISTS');
  });

  it('returns 409 for duplicate email', async () => {
    await registerAndGetToken('other', 'taken@example.com');
    const token = await registerAndGetToken('user6', 'user6@example.com');

    const res = await app.request('/api/v1/users/me/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email: 'taken@example.com' }),
    }, env);

    expect(res.status).toBe(409);
    const json = await res.json() as { success: boolean; error: { code: string } };
    expect(json.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });
});

describe('PATCH /api/v1/users/me/password', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
  });

  it('returns 401 without auth token', async () => {
    const res = await app.request('/api/v1/users/me/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: 'old', new_password: 'newpassword' }),
    }, env);
    expect(res.status).toBe(401);
  });

  it('changes password successfully', async () => {
    const token = await registerAndGetToken('pwuser', 'pwuser@example.com', 'oldpassword1');

    const res = await app.request('/api/v1/users/me/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_password: 'oldpassword1', new_password: 'newpassword1' }),
    }, env);

    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean };
    expect(json.success).toBe(true);
  });

  it('can login with new password after change', async () => {
    const token = await registerAndGetToken('pwuser2', 'pwuser2@example.com', 'oldpassword2');

    await app.request('/api/v1/users/me/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_password: 'oldpassword2', new_password: 'newpassword2' }),
    }, env);

    const loginRes = await app.request('/api/v1/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'pwuser2@example.com', password: 'newpassword2' }),
    }, env);

    expect(loginRes.status).toBe(200);
  });

  it('returns 400 for wrong current password', async () => {
    const token = await registerAndGetToken('pwuser3', 'pwuser3@example.com', 'correctpassword');

    const res = await app.request('/api/v1/users/me/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_password: 'wrongpassword', new_password: 'newpassword3' }),
    }, env);

    expect(res.status).toBe(400);
    const json = await res.json() as { success: boolean; error: { code: string } };
    expect(json.error.code).toBe('INVALID_CURRENT_PASSWORD');
  });

  it('returns 400 for new password shorter than 8 chars', async () => {
    const token = await registerAndGetToken('pwuser4', 'pwuser4@example.com', 'correctpassword');

    const res = await app.request('/api/v1/users/me/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_password: 'correctpassword', new_password: 'short' }),
    }, env);

    expect(res.status).toBe(400);
    const json = await res.json() as { success: boolean; error: { code: string } };
    expect(json.error.code).toBe('PASSWORD_TOO_SHORT');
  });

  it('returns 400 when fields are missing', async () => {
    const token = await registerAndGetToken('pwuser5', 'pwuser5@example.com');

    const res = await app.request('/api/v1/users/me/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ current_password: 'password123' }),
    }, env);

    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/users (public feed)', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM users').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  it('returns empty feed when no public bookmarks', async () => {
    const res = await app.request('/api/v1/users', {}, env);
    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; data: { items: unknown[]; hasMore: boolean } };
    expect(json.success).toBe(true);
    expect(json.data.items).toHaveLength(0);
    expect(json.data.hasMore).toBe(false);
  });

  it('returns public bookmarks with username', async () => {
    const token = await registerAndGetToken('feeduser', 'feed@example.com');

    // Create itinerary and bookmark it
    const itinRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: '公開しおり' }),
    }, env);
    const itinJson = await itinRes.json() as { data: { id: string } };
    const itineraryId = itinJson.data.id;

    // Make bookmark visible (it's visible by default)
    const res = await app.request('/api/v1/users', {}, env);
    expect(res.status).toBe(200);
    const json = await res.json() as { success: boolean; data: { items: { username: string; title: string; itinerary_id: string }[]; hasMore: boolean } };
    expect(json.data.items).toHaveLength(1);
    expect(json.data.items[0].username).toBe('feeduser');
    expect(json.data.items[0].title).toBe('公開しおり');
    expect(json.data.items[0].itinerary_id).toBe(itineraryId);
  });

  it('excludes non-visible bookmarks', async () => {
    const token = await registerAndGetToken('feeduser2', 'feed2@example.com');

    const itinRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: '非公開しおり' }),
    }, env);
    const itinJson = await itinRes.json() as { data: { id: string } };
    const itineraryId = itinJson.data.id;

    // Hide the bookmark
    await app.request(`/api/v1/users/me/bookmarks/${itineraryId}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ is_visible: false }),
    }, env);

    const res = await app.request('/api/v1/users', {}, env);
    const json = await res.json() as { data: { items: unknown[] } };
    expect(json.data.items).toHaveLength(0);
  });

  it('returns hasMore=false when items fit in one page', async () => {
    const token = await registerAndGetToken('feeduser3', 'feed3@example.com');

    for (let i = 0; i < 2; i++) {
      await app.request('/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: `しおり${i}` }),
      }, env);
    }

    const res = await app.request('/api/v1/users', {}, env);
    const json = await res.json() as { data: { items: unknown[]; hasMore: boolean } };
    expect(json.data.items).toHaveLength(2);
    expect(json.data.hasMore).toBe(false);
  });

  it('returns hasMore=true and correct items when there are more than 30', async () => {
    const token = await registerAndGetToken('feeduser4', 'feed4@example.com');

    // Create 31 itineraries to exceed the default limit of 30
    for (let i = 0; i < 31; i++) {
      await app.request('/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: `しおり${i}` }),
      }, env);
    }

    const res = await app.request('/api/v1/users', {}, env);
    const json = await res.json() as { data: { items: unknown[]; hasMore: boolean } };
    expect(json.data.items).toHaveLength(30);
    expect(json.data.hasMore).toBe(true);

    // Fetch next page
    const res2 = await app.request('/api/v1/users?offset=30', {}, env);
    const json2 = await res2.json() as { data: { items: unknown[]; hasMore: boolean } };
    expect(json2.data.items).toHaveLength(1);
    expect(json2.data.hasMore).toBe(false);
  });
});
