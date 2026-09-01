import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index';
import { generateToken } from '../src/utils/jwt';

async function ensureSchema(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS itineraries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      theme_id TEXT NOT NULL DEFAULT 'standard-autumn',
      palette_id TEXT NOT NULL DEFAULT 'sakura',
      background_image TEXT,
      page_background_image TEXT,
      source_itinerary_id TEXT,
      password TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  const columns = await db.prepare('PRAGMA table_info(itineraries)').all<{ name: string }>();
  if (!(columns.results ?? []).some((column) => column.name === 'background_image')) {
    await db.prepare('ALTER TABLE itineraries ADD COLUMN background_image TEXT').run();
  }
  if (!(columns.results ?? []).some((column) => column.name === 'page_background_image')) {
    await db.prepare('ALTER TABLE itineraries ADD COLUMN page_background_image TEXT').run();
  }
}

async function insertItinerary(options: {
  id: string;
  password?: string | null;
  sourceId?: string | null;
  background?: string | null;
  pageBackground?: string | null;
}) {
  await env.DB.prepare(`
    INSERT INTO itineraries (
      id, title, theme_id, palette_id, background_image, page_background_image, source_itinerary_id,
      password, created_at, updated_at
    ) VALUES (?, ?, 'standard-spring', 'sakura', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    options.id,
    `Trip ${options.id}`,
    options.background ?? null,
    options.pageBackground ?? null,
    options.sourceId ?? null,
    options.password ?? null,
  ).run();
}

describe('Itinerary backgrounds API', () => {
  beforeEach(async () => {
    await ensureSchema(env.DB);
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  it('loads the current background', async () => {
    await insertItinerary({ id: 'background-read', background: '/hero/background-spring.avif' });

    const response = await app.request('/api/v1/backgrounds/background-read', {}, env);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { cover_background_image: '/hero/background-spring.avif', page_background_image: null },
    });
  });

  it('updates a passwordless itinerary with a generated preset', async () => {
    await insertItinerary({ id: 'background-open' });

    const response = await app.request('/api/v1/backgrounds/background-open', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_background_image: '/itinerary-backgrounds/lake.avif', page_background_image: '/itinerary-backgrounds/town.avif' }),
    }, env);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { cover_background_image: '/itinerary-backgrounds/lake.avif', page_background_image: '/itinerary-backgrounds/town.avif' },
    });

    const row = await env.DB.prepare('SELECT background_image, page_background_image FROM itineraries WHERE id = ?')
      .bind('background-open')
      .first<{ background_image: string | null; page_background_image: string | null }>();
    expect(row?.background_image).toBe('/itinerary-backgrounds/lake.avif');
    expect(row?.page_background_image).toBe('/itinerary-backgrounds/town.avif');
  });

  it('accepts the existing home hero images', async () => {
    await insertItinerary({ id: 'background-home' });

    const response = await app.request('/api/v1/backgrounds/background-home', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_background_image: '/hero/background-winter.avif', page_background_image: null }),
    }, env);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { cover_background_image: '/hero/background-winter.avif', page_background_image: null },
    });
  });

  it('updates a password-protected itinerary when its edit token is provided', async () => {
    await insertItinerary({ id: 'background-protected', password: 'hashed-password' });
    const token = await generateToken('background-protected', env.JWT_SECRET);

    const response = await app.request('/api/v1/backgrounds/background-protected', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ cover_background_image: '/hero/background-summer.avif', page_background_image: null }),
    }, env);

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { cover_background_image: '/hero/background-summer.avif', page_background_image: null },
    });
  });

  it('rejects a password-protected itinerary without its edit token', async () => {
    await insertItinerary({ id: 'background-protected-no-token', password: 'hashed-password' });

    const response = await app.request('/api/v1/backgrounds/background-protected-no-token', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_background_image: '/hero/background-summer.avif' }),
    }, env);

    expect(response.status).toBe(403);
  });

  it('does not allow editing a public snapshot', async () => {
    await insertItinerary({ id: 'background-source' });
    await insertItinerary({ id: 'background-public', sourceId: 'background-source' });

    const response = await app.request('/api/v1/backgrounds/background-public', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_background_image: '/hero/background-autumn.avif' }),
    }, env);

    expect(response.status).toBe(403);
  });

  it('rejects unknown background paths', async () => {
    await insertItinerary({ id: 'background-invalid' });

    const response = await app.request('/api/v1/backgrounds/background-invalid', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cover_background_image: '/not-a-preset.jpg' }),
    }, env);

    expect(response.status).toBe(400);
  });
});
