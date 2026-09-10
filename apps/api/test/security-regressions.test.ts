import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index';

async function applyMigrations(db: D1Database) {
  await db.prepare('DROP TABLE IF EXISTS itinerary_fork_stats').run();
  await db.prepare('DROP TABLE IF EXISTS itinerary_money_settings').run();
  await db.prepare('DROP TABLE IF EXISTS itinerary_secrets').run();
  await db.prepare('DROP TABLE IF EXISTS steps').run();
  await db.prepare('DROP TABLE IF EXISTS itineraries').run();

  for (const sql of [
    `CREATE TABLE itineraries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      theme_id TEXT NOT NULL DEFAULT 'planning-draft',
      palette_id TEXT NOT NULL DEFAULT 'neutral',
      packing_enabled INTEGER NOT NULL DEFAULT 1,
      prefecture_slugs TEXT NOT NULL DEFAULT '[]',
      areas TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      metadata_initialized INTEGER NOT NULL DEFAULT 0,
      memo TEXT,
      password TEXT,
      source_itinerary_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE steps (
      id TEXT PRIMARY KEY,
      itinerary_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start_at INTEGER NOT NULL,
      end_at INTEGER NOT NULL,
      location TEXT,
      notes TEXT,
      link TEXT,
      type TEXT NOT NULL DEFAULT 'normal:general',
      is_all_day INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE itinerary_secrets (
      itinerary_id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT FALSE,
      offset_minutes INTEGER DEFAULT 60,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE itinerary_money_settings (
      itinerary_id TEXT PRIMARY KEY,
      budget_amount INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE itinerary_fork_stats (
      itinerary_id TEXT PRIMARY KEY,
      fork_count INTEGER NOT NULL DEFAULT 0
    )`,
  ]) await db.prepare(sql).run();
}

async function createProtectedItinerary(title: string) {
  const response = await app.request('/api/v1/itineraries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, password: 'password123' }),
  }, env);
  expect(response.status).toBe(201);
  return (await response.json() as any).data as { id: string; token: string };
}

describe('security regressions', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
  });

  it('does not enumerate source itinerary IDs from the public itinerary list', async () => {
    const source = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'private source' }),
    }, env);
    const sourceData = (await source.json() as any).data;

    await env.DB.prepare(`INSERT INTO itineraries
      (id, title, theme_id, palette_id, packing_enabled, prefecture_slugs, areas, tags, metadata_initialized, memo, password, source_itinerary_id, created_at, updated_at)
      VALUES (?, 'public snapshot', 'planning-draft', 'neutral', 1, '[]', '[]', '[]', 0, NULL, NULL, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`)
      .bind('published-snapshot', sourceData.id).run();

    const response = await app.request('/api/v1/itineraries', {}, env);
    expect(response.status).toBe(200);
    const data = (await response.json() as any).data;
    expect(data.map((item: any) => item.id)).toEqual(['published-snapshot']);
  });

  it('does not reveal secret steps with a token issued for another itinerary', async () => {
    const target = await createProtectedItinerary('target');
    const attacker = await createProtectedItinerary('attacker');
    const now = Date.now();

    await env.DB.prepare(
      'INSERT INTO itinerary_secrets (itinerary_id, enabled, offset_minutes, created_at, updated_at) VALUES (?, 1, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    ).bind(target.id).run();

    const createStep = await app.request('/api/v1/steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${target.token}` },
      body: JSON.stringify({
        itinerary_id: target.id,
        title: 'secret destination',
        start_at: now + 2 * 60 * 60 * 1000,
        end_at: now + 3 * 60 * 60 * 1000,
        location: 'secret location',
      }),
    }, env);
    expect(createStep.status).toBe(201);

    const wrongTokenResponse = await app.request(`/api/v1/steps?itinerary_id=${target.id}`, {
      headers: { Authorization: `Bearer ${attacker.token}` },
    }, env);
    expect(wrongTokenResponse.status).toBe(200);
    const wrongTokenData = (await wrongTokenResponse.json() as any).data;
    expect(wrongTokenData[0].title).toBe('?????');
    expect(wrongTokenData[0].location).toBeNull();

    const ownerResponse = await app.request(`/api/v1/steps?itinerary_id=${target.id}`, {
      headers: { Authorization: `Bearer ${target.token}` },
    }, env);
    expect(ownerResponse.status).toBe(200);
    const ownerData = (await ownerResponse.json() as any).data;
    expect(ownerData[0].title).toBe('secret destination');
    expect(ownerData[0].location).toBe('secret location');
  });
});
