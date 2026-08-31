import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index';
import { createFirebaseToken, installFirebaseCertMock } from './helpers/firebase-auth';

beforeAll(() => installFirebaseCertMock());

beforeEach(async () => {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, prefecture TEXT, email_verified_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare('DELETE FROM users').run();
});

function postBootstrap(token?: string, body: Record<string, unknown> = {}) {
  return app.request('/api/v1/users/me/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  }, env);
}

describe('Firebase account authentication', () => {
  it('requires a signed bearer token', async () => {
    expect((await postBootstrap()).status).toBe(401);
    expect((await postBootstrap('not-a-jwt')).status).toBe(401);
  });

  it('blocks a valid Firebase account until its email is verified', async () => {
    const token = await createFirebaseToken('pending-id', 'pending@example.com', false);
    const response = await postBootstrap(token, { username: 'pending', prefecture: '東京都' });
    expect(response.status).toBe(403);
    expect((await response.json() as any).error.code).toBe('EMAIL_NOT_VERIFIED');
  });

  it('creates a D1 profile only after verification', async () => {
    const token = await createFirebaseToken('new-id', 'NEW@example.com');
    const response = await postBootstrap(token, { username: 'new_user', prefecture: '京都府' });
    expect(response.status).toBe(200);
    const json = await response.json() as any;
    expect(json.data).toMatchObject({ username: 'new_user', email: 'new@example.com', prefecture: '京都府', email_verified: true, profile_complete: true });
    const row = await env.DB.prepare('SELECT id, password_hash FROM users WHERE id = ?').bind('new-id').first<any>();
    expect(row).toEqual({ id: 'new-id', password_hash: '!firebase-managed!' });
  });

  it('requires username and prefecture for a new Firebase user', async () => {
    const token = await createFirebaseToken('incomplete-id', 'incomplete@example.com');
    const response = await postBootstrap(token);
    expect(response.status).toBe(409);
    expect((await response.json() as any).error.code).toBe('PROFILE_SETUP_REQUIRED');
  });

  it('activates a migrated D1 user while preserving the uid and legacy hash', async () => {
    const oldHash = '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ12345';
    await env.DB.prepare(`INSERT INTO users (id, username, email, password_hash, prefecture, email_verified_at, created_at, updated_at)
      VALUES ('legacy-id', 'legacy', 'legacy@example.com', ?, NULL, NULL, '2025-01-01', '2025-01-01')`).bind(oldHash).run();
    const token = await createFirebaseToken('legacy-id', 'legacy@example.com');
    const response = await postBootstrap(token, { prefecture: '北海道' });
    expect(response.status).toBe(200);
    const row = await env.DB.prepare('SELECT password_hash, prefecture, email_verified_at FROM users WHERE id = ?').bind('legacy-id').first<any>();
    expect(row.password_hash).toBe(oldHash);
    expect(row.prefecture).toBe('北海道');
    expect(row.email_verified_at).toBeTruthy();
  });

  it('maps a verified Firebase login to an existing account with the same email', async () => {
    await env.DB.prepare(`INSERT INTO users (id, username, email, password_hash, prefecture, email_verified_at, created_at, updated_at)
      VALUES ('official-user', 'tabitabi_official', 'official@tabitabi.jp', '!seeded!', '東京都', '2025-01-01', '2025-01-01', '2025-01-01')`).run();
    const token = await createFirebaseToken('firebase-generated-uid', 'OFFICIAL@tabitabi.jp');
    const response = await postBootstrap(token);
    expect(response.status).toBe(200);
    expect((await response.json() as any).data.username).toBe('tabitabi_official');
    const duplicate = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind('firebase-generated-uid').first();
    expect(duplicate).toBeNull();
  });

  it('rejects tokens issued for another Firebase project', async () => {
    const token = await createFirebaseToken('wrong-project', 'wrong@example.com', true, { audience: 'other-project' });
    expect((await postBootstrap(token, { username: 'wrong', prefecture: '東京都' })).status).toBe(401);
  });

  it('enforces unique usernames', async () => {
    const first = await createFirebaseToken('first-id', 'first@example.com');
    const second = await createFirebaseToken('second-id', 'second@example.com');
    expect((await postBootstrap(first, { username: 'traveler', prefecture: '東京都' })).status).toBe(200);
    const response = await postBootstrap(second, { username: 'traveler', prefecture: '大阪府' });
    expect(response.status).toBe(409);
    expect((await response.json() as any).error.code).toBe('USERNAME_ALREADY_EXISTS');
  });
});