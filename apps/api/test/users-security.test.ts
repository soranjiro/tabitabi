import { env } from 'cloudflare:test';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index';
import { generateToken } from '../src/utils/jwt';
import { createFirebaseToken, installFirebaseCertMock } from './helpers/firebase-auth';

beforeAll(() => installFirebaseCertMock());

beforeEach(async () => {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, prefecture TEXT, email_verified_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS itineraries (
    id TEXT PRIMARY KEY, title TEXT NOT NULL,
    theme_id TEXT NOT NULL DEFAULT 'planning-draft', palette_id TEXT NOT NULL DEFAULT 'neutral',
    packing_enabled INTEGER NOT NULL DEFAULT 1,
    prefecture_slugs TEXT NOT NULL DEFAULT '[]', areas TEXT NOT NULL DEFAULT '[]', tags TEXT NOT NULL DEFAULT '[]',
    metadata_initialized INTEGER NOT NULL DEFAULT 0, memo TEXT, password TEXT, source_itinerary_id TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS user_bookmarks (
    user_id TEXT NOT NULL, itinerary_id TEXT NOT NULL, is_visible BOOLEAN NOT NULL DEFAULT 0,
    prefecture_slugs TEXT NOT NULL DEFAULT '[]', areas TEXT NOT NULL DEFAULT '[]', tags TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, itinerary_id)
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS itinerary_publications (
    source_itinerary_id TEXT NOT NULL, shared_itinerary_id TEXT NOT NULL, user_id TEXT NOT NULL,
    prefecture_slugs TEXT NOT NULL DEFAULT '[]', areas TEXT NOT NULL DEFAULT '[]', tags TEXT NOT NULL DEFAULT '[]',
    published_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    PRIMARY KEY (source_itinerary_id, user_id)
  )`).run();

  await env.DB.prepare('DELETE FROM itinerary_publications').run();
  await env.DB.prepare('DELETE FROM user_bookmarks').run();
  await env.DB.prepare('DELETE FROM itineraries').run();
  await env.DB.prepare('DELETE FROM users').run();

  await env.DB.prepare(`INSERT INTO users
    (id, username, email, password_hash, prefecture, email_verified_at, created_at, updated_at)
    VALUES ('security-user', 'security_user', 'security@example.com', '!firebase-managed!', '東京都', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .run();
  await env.DB.prepare(`INSERT INTO itineraries
    (id, title, password, created_at, updated_at)
    VALUES ('protected-trip', 'Protected trip', 'non-null-password-hash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .run();
  await env.DB.prepare(`INSERT INTO itineraries
    (id, title, password, created_at, updated_at)
    VALUES ('other-trip', 'Other trip', 'non-null-password-hash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .run();
  await env.DB.prepare(`INSERT INTO user_bookmarks
    (user_id, itinerary_id, is_visible, created_at, updated_at)
    VALUES ('security-user', 'protected-trip', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
    .run();
});

async function accountToken() {
  return createFirebaseToken('security-user', 'security@example.com');
}

const publishBody = JSON.stringify({ prefecture_slugs: ['tokyo'], areas: [], tags: [] });

describe('account itinerary authorization', () => {
  it('rejects publishing a protected saved itinerary without its edit token', async () => {
    const response = await app.request('/api/v1/users/me/bookmarks/protected-trip/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await accountToken()}` },
      body: publishBody,
    }, env);

    expect(response.status).toBe(403);
    expect((await response.json() as any).error.code).toBe('FORBIDDEN');
  });

  it('rejects an edit token issued for a different itinerary', async () => {
    const otherItineraryToken = await generateToken('other-trip', env.JWT_SECRET);
    const response = await app.request('/api/v1/users/me/bookmarks/protected-trip/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await accountToken()}`,
        'X-Itinerary-Token': otherItineraryToken,
      },
      body: publishBody,
    }, env);

    expect(response.status).toBe(403);
    expect((await response.json() as any).error.code).toBe('FORBIDDEN');
  });

  it('rejects restoring into a protected source without its edit token', async () => {
    await env.DB.prepare(`INSERT INTO itineraries
      (id, title, source_itinerary_id, created_at, updated_at)
      VALUES ('published-copy', 'Published copy', 'protected-trip', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
      .run();
    await env.DB.prepare(`INSERT INTO itinerary_publications
      (source_itinerary_id, shared_itinerary_id, user_id, published_at, updated_at)
      VALUES ('protected-trip', 'published-copy', 'security-user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
      .run();

    const response = await app.request('/api/v1/users/me/bookmarks/protected-trip/publication/restore', {
      method: 'POST',
      headers: { Authorization: `Bearer ${await accountToken()}` },
    }, env);

    expect(response.status).toBe(403);
    expect((await response.json() as any).error.code).toBe('FORBIDDEN');
  });
});
