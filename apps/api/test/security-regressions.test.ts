import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index';
import { PublicationService } from '../src/services/publication.service';

async function applyMigrations(db: D1Database) {
  await db.prepare('DROP TABLE IF EXISTS api_rate_limit_counters').run();
  await db.prepare('DROP TABLE IF EXISTS itinerary_fork_stats').run();
  await db.prepare('DROP TABLE IF EXISTS itinerary_money_settings').run();
  await db.prepare('DROP TABLE IF EXISTS itinerary_members').run();
  await db.prepare('DROP TABLE IF EXISTS itinerary_secrets').run();
  await db.prepare('DROP TABLE IF EXISTS steps').run();
  await db.prepare('DROP TABLE IF EXISTS itineraries').run();

  for (const sql of [
    `CREATE TABLE IF NOT EXISTS api_rate_limit_counters (
      bucket_key TEXT PRIMARY KEY,
      window_start INTEGER NOT NULL,
      hit_count INTEGER NOT NULL DEFAULT 0 CHECK (hit_count >= 0)
    )`,
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
      background_image TEXT,
      page_background_image TEXT,
      background_display TEXT NOT NULL DEFAULT 'cover',
      memo_text TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE steps (
      id TEXT PRIMARY KEY,
      itinerary_id TEXT NOT NULL,
      title TEXT NOT NULL,
      start_at INTEGER NOT NULL,
      end_at INTEGER NOT NULL,
      scheduled_start_at INTEGER,
      scheduled_end_at INTEGER,
      time_unspecified INTEGER NOT NULL DEFAULT 0,
      sort_order REAL,
      pin_latitude REAL,
      pin_longitude REAL,
      is_priority INTEGER NOT NULL DEFAULT 0,
      source_step_id TEXT,
      location TEXT,
      notes TEXT,
      link TEXT,
      type TEXT NOT NULL DEFAULT 'normal:general',
      is_all_day INTEGER NOT NULL DEFAULT 0,
      notes_text TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE itinerary_secrets (
      itinerary_id TEXT PRIMARY KEY,
      enabled BOOLEAN DEFAULT FALSE,
      offset_minutes INTEGER DEFAULT 60,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE itinerary_members (itinerary_id TEXT NOT NULL, name TEXT NOT NULL)`,
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
    expect(data[0].is_shared_snapshot).toBe(true);
    expect(data[0]).not.toHaveProperty('source_itinerary_id');
    expect(JSON.stringify(data)).not.toContain(sourceData.id);

    const detail = await app.request('/api/v1/itineraries/published-snapshot', {}, env);
    const detailData = (await detail.json() as any).data;
    expect(detailData.is_shared_snapshot).toBe(true);
    expect(detailData).not.toHaveProperty('source_itinerary_id');
    expect(JSON.stringify(detailData)).not.toContain(sourceData.id);

    const sourceDetail = await app.request(`/api/v1/itineraries/${sourceData.id}`, {}, env);
    expect((await sourceDetail.json() as any).data.is_shared_snapshot).toBe(false);
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
        notes: 'secret note',
        link: 'https://example.com/secret',
        pin_latitude: 35.68,
        pin_longitude: 139.76,
        is_priority: true,
        type: 'normal:hotel',
      }),
    }, env);
    expect(createStep.status).toBe(201);
    const createdStep = (await createStep.json() as any).data;

    const wrongTokenResponse = await app.request(`/api/v1/steps?itinerary_id=${target.id}`, {
      headers: { Authorization: `Bearer ${attacker.token}` },
    }, env);
    expect(wrongTokenResponse.status).toBe(200);
    const wrongTokenData = (await wrongTokenResponse.json() as any).data;
    expect(wrongTokenData[0].title).toBe('?????');
    expect(wrongTokenData[0].location).toBeNull();
    expect(wrongTokenData[0].pin_latitude).toBeNull();
    expect(wrongTokenData[0].pin_longitude).toBeNull();
    expect(wrongTokenData[0].is_priority).toBe(false);

    const requestHeaders: Record<string, string>[] = [{}, { Authorization: `Bearer ${attacker.token}` }];
    for (const headers of requestHeaders) {
      for (const path of [`/api/v1/steps?itinerary_id=${target.id}`, `/api/v1/steps/${createdStep.id}`]) {
        const response = await app.request(path, { headers }, env);
        expect(response.status).toBe(200);
        const result = (await response.json() as any).data;
        const step = Array.isArray(result) ? result[0] : result;
        expect(step).toMatchObject({
          title: '?????', location: null, notes: '', link: null,
          pin_latitude: null, pin_longitude: null, is_priority: false, type: 'normal:general',
        });
      }
    }

    const ownerDetail = await app.request(`/api/v1/steps/${createdStep.id}`, {
      headers: { Authorization: `Bearer ${target.token}` },
    }, env);
    expect((await ownerDetail.json() as any).data).toMatchObject({
      title: 'secret destination', pin_latitude: 35.68, pin_longitude: 139.76, is_priority: true,
    });

    const ownerResponse = await app.request(`/api/v1/steps?itinerary_id=${target.id}`, {
      headers: { Authorization: `Bearer ${target.token}` },
    }, env);
    expect(ownerResponse.status).toBe(200);
    const ownerData = (await ownerResponse.json() as any).data;
    expect(ownerData[0].title).toBe('secret destination');
    expect(ownerData[0].location).toBe('secret location');
  });

  it('rejects all attempts to set, rotate or remove an existing itinerary password', async () => {
    const protectedBook = await createProtectedItinerary('locked');
    for (const password of ['new-password', '']) {
      const response = await app.request(`/api/v1/itineraries/${protectedBook.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${protectedBook.token}` },
        body: JSON.stringify({ password }),
      }, env);
      expect(response.status).toBe(400);
    }

    const publicBook = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'originally unprotected' }),
    }, env);
    const id = (await publicBook.json() as any).data.id;
    const setLater = await app.request(`/api/v1/itineraries/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'changed-by-collaborator' }),
    }, env);
    expect(setLater.status).toBe(400);

    const stillProtected = await app.request('/api/v1/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shioriId: protectedBook.id, password: 'password123' }),
    }, env);
    expect(stillProtected.status).toBe(200);
  });

  it('masks future secret details in sanitized bookmarked previews', async () => {
    const itinerary = await createProtectedItinerary('masked source');
    const now = Date.now();
    await env.DB.prepare(
      'INSERT INTO itinerary_secrets (itinerary_id, enabled, offset_minutes, created_at, updated_at) VALUES (?, 1, 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
    ).bind(itinerary.id).run();

    const created = await app.request('/api/v1/steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${itinerary.token}` },
      body: JSON.stringify({
        itinerary_id: itinerary.id, title: 'hidden waterfall',
        start_at: now + 4 * 60 * 60 * 1000, end_at: now + 5 * 60 * 60 * 1000,
        location: 'hidden station', notes: 'hidden personal note',
        pin_latitude: 35.7, pin_longitude: 139.8, is_priority: true,
      }),
    }, env);
    expect(created.status).toBe(201);

    // This service powers GET /users/me/bookmarks/:itineraryId/preview.
    const preview = await new PublicationService(env.DB, env).read(itinerary.id, true);
    expect(preview.steps).toHaveLength(1);
    expect(preview.steps[0]).toMatchObject({
      title: '?????', location: null, notes: '', pin_latitude: null, pin_longitude: null, is_priority: false,
    });
    const serialized = JSON.stringify(preview);
    for (const secret of ['hidden waterfall', 'hidden station', 'hidden personal note']) {
      expect(serialized).not.toContain(secret);
    }
  });

});
