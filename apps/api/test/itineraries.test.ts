import { env } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import app from '../src/index';
import { insertVerifiedUser, installFirebaseCertMock } from './helpers/firebase-auth';

beforeAll(() => installFirebaseCertMock());

async function applyMigrations(db: D1Database) {
  const migrations = [
    `CREATE TABLE IF NOT EXISTS itineraries (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      theme_id TEXT NOT NULL DEFAULT 'standard-autumn',
      palette_id TEXT NOT NULL DEFAULT 'sakura',
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
    );`,
    `CREATE INDEX IF NOT EXISTS idx_itineraries_source_id ON itineraries(source_itinerary_id) WHERE source_itinerary_id IS NOT NULL;`,
    `CREATE TABLE IF NOT EXISTS steps (
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
    `CREATE TABLE IF NOT EXISTS itinerary_money_settings (
      itinerary_id TEXT PRIMARY KEY,
      budget_amount INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    );`,
    `CREATE TRIGGER IF NOT EXISTS delete_published_snapshot_with_source
      BEFORE DELETE ON itineraries WHEN OLD.source_itinerary_id IS NULL
      BEGIN DELETE FROM itineraries WHERE source_itinerary_id = OLD.id; END;`,
    `CREATE TABLE IF NOT EXISTS itinerary_fork_stats (
      itinerary_id TEXT PRIMARY KEY,
      fork_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      prefecture TEXT,
      email_verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS user_bookmarks (
      user_id TEXT NOT NULL,
      itinerary_id TEXT NOT NULL,
      is_visible BOOLEAN NOT NULL DEFAULT 1,
      prefecture_slugs TEXT NOT NULL DEFAULT '[]',
      areas TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, itinerary_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS itinerary_publications (
      source_itinerary_id TEXT NOT NULL,
      shared_itinerary_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      prefecture_slugs TEXT NOT NULL,
      areas TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      published_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (source_itinerary_id, user_id)
    );`,
    `CREATE TABLE IF NOT EXISTS official_itinerary_aliases (
      alias TEXT PRIMARY KEY,
      itinerary_id TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS itinerary_members (
      id TEXT PRIMARY KEY,
      itinerary_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(id, itinerary_id),
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS itinerary_money_items (
      id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, title TEXT NOT NULL, amount INTEGER NOT NULL,
      paid_by_member_id TEXT, paid_from_fund INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL, is_settled INTEGER NOT NULL DEFAULT 0, occurred_on TEXT, step_id TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(id, itinerary_id),
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
      FOREIGN KEY (paid_by_member_id, itinerary_id) REFERENCES itinerary_members(id, itinerary_id) ON DELETE RESTRICT,
      FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE SET NULL
    );`,
    `CREATE TABLE IF NOT EXISTS itinerary_money_item_splits (
      item_id TEXT NOT NULL, member_id TEXT NOT NULL, itinerary_id TEXT NOT NULL, amount INTEGER,
      PRIMARY KEY (item_id, member_id),
      FOREIGN KEY (item_id, itinerary_id) REFERENCES itinerary_money_items(id, itinerary_id) ON DELETE CASCADE,
      FOREIGN KEY (member_id, itinerary_id) REFERENCES itinerary_members(id, itinerary_id) ON DELETE RESTRICT
    );`,
    `CREATE TABLE IF NOT EXISTS itinerary_money_fund_transactions (
      id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, member_id TEXT NOT NULL,
      kind TEXT NOT NULL, amount INTEGER NOT NULL, note TEXT, occurred_on TEXT NOT NULL, created_at TEXT NOT NULL,
      FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id, itinerary_id) REFERENCES itinerary_members(id, itinerary_id) ON DELETE RESTRICT
    );`,
  ];

  for (const sql of migrations) {
    await db.prepare(sql).run();
  }
}

describe('Itineraries API', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM steps').run();
    await env.DB.prepare('DELETE FROM itinerary_secrets').run();
    await env.DB.prepare('DELETE FROM itinerary_money_item_splits').run();
    await env.DB.prepare('DELETE FROM itinerary_money_items').run();
    await env.DB.prepare('DELETE FROM itinerary_money_fund_transactions').run();
    await env.DB.prepare('DELETE FROM itinerary_money_settings').run();
    await env.DB.prepare('DELETE FROM itinerary_members').run();
    await env.DB.prepare('DELETE FROM official_itinerary_aliases').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
  });

  describe('POST /api/v1/itineraries', () => {
    it('creates a new itinerary with title', async () => {
      const request = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Trip' }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(201);

      const { success, data } = await response.json() as any;
      expect(success).toBe(true);
      expect(data.title).toBe('Test Trip');
      expect(data.theme_id).toBe('planning-draft');
      expect(data.palette_id).toBe('neutral');
      expect(data.packing_enabled).toBe(true);
      expect(data.metadata_initialized).toBe(false);
      expect(data.prefecture_slugs).toEqual([]);
      expect(data.id).toBeDefined();
      expect(data.token).toBeDefined();
    });

    it('stores feature switches and destination metadata on the itinerary', async () => {
      const createResponse = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Metadata trip' }),
      }), env);
      const { data: created } = await createResponse.json() as any;

      const updateResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packing_enabled: false,
          prefecture_slugs: ['kyoto'],
          areas: ['嵐山'],
          tags: ['グルメ'],
          metadata_initialized: true,
        }),
      }), env);

      expect(updateResponse.status).toBe(200);
      const { data } = await updateResponse.json() as any;
      expect(data.packing_enabled).toBe(false);
      expect(data.prefecture_slugs).toEqual(['kyoto']);
      expect(data.areas).toEqual(['嵐山']);
      expect(data.tags).toEqual(['グルメ']);
      expect(data.metadata_initialized).toBe(true);
    });

    it('creates itinerary with custom theme', async () => {
      const request = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Custom Theme Trip', theme_id: 'standard' }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(201);

      const { data } = await response.json() as any;
      expect(data.theme_id).toBe('standard');
    });

    it('creates itinerary with memo', async () => {
      const request = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Trip with Memo', memo: 'Remember to pack sunscreen' }),
      });

      const response = await app.fetch(request, env);
      expect(response.status).toBe(201);

      const { data } = await response.json() as any;
      expect(data.memo).toBe('Remember to pack sunscreen');
      const stored = await env.DB.prepare('SELECT memo, memo_text FROM itineraries WHERE id = ?')
        .bind(data.id).first<{ memo: string; memo_text: string }>();
      expect(stored?.memo_text).toBe('Remember to pack sunscreen');
      expect(JSON.parse(stored!.memo).text).toBe('Remember to pack sunscreen');
      await env.DB.prepare(`UPDATE itineraries SET memo = '{"text":"old","legacy_theme":{"keep":true}}' WHERE id = ?`)
        .bind(data.id).run();
      await app.request(`/api/v1/itineraries/${data.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
        body: JSON.stringify({ memo: 'updated memo' }),
      }, env);
      const updated = await env.DB.prepare('SELECT memo, memo_text FROM itineraries WHERE id = ?')
        .bind(data.id).first<{ memo: string; memo_text: string }>();
      expect(updated?.memo_text).toBe('updated memo');
      expect(JSON.parse(updated!.memo)).toMatchObject({ text: 'updated memo', legacy_theme: { keep: true } });
    });
  });

  describe('GET /api/v1/itineraries', () => {
    it('returns empty array when no itineraries exist', async () => {
      const request = new Request('http://localhost/api/v1/itineraries');
      const response = await app.fetch(request, env);

      expect(response.status).toBe(200);
      const { success, data } = await response.json() as any;
      expect(success).toBe(true);
      expect(data).toEqual([]);
    });

    it('returns published snapshots without enumerating source itineraries', async () => {
      const sourceIds: string[] = [];
      for (const title of ['Trip 1', 'Trip 2']) {
        const createResponse = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        }), env);
        const { data: source } = await createResponse.json() as any;
        sourceIds.push(source.id);

        const publishResponse = await app.fetch(new Request(
          `http://localhost/api/v1/itineraries/${source.id}/publish`,
          { method: 'POST' },
        ), env);
        expect(publishResponse.status).toBe(200);
      }

      const request = new Request('http://localhost/api/v1/itineraries');
      const response = await app.fetch(request, env);

      expect(response.status).toBe(200);
      const { data } = await response.json() as any;
      expect(data).toHaveLength(2);
      expect(data.every((itinerary: { id: string }) => !sourceIds.includes(itinerary.id))).toBe(true);
    });
  });

  describe('GET /api/v1/itineraries/:id', () => {
    it('returns itinerary by id', async () => {
      const createRequest = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'My Trip' }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as any;

      const request = new Request(`http://localhost/api/v1/itineraries/${created.id}`);
      const response = await app.fetch(request, env);

      expect(response.status).toBe(200);
      const { data } = await response.json() as any;
      expect(data.id).toBe(created.id);
      expect(data.title).toBe('My Trip');
    });

    it('returns 404 for non-existent itinerary', async () => {
      const request = new Request('http://localhost/api/v1/itineraries/nonexistent');
      const response = await app.fetch(request, env);

      expect(response.status).toBe(404);
      const { success, error } = await response.json() as any;
      expect(success).toBe(false);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('resolves an official alias to the current published snapshot', async () => {
      await env.DB.prepare(`INSERT INTO users
        (id, username, email, password_hash, created_at, updated_at)
        VALUES ('official-user', 'official', 'official@example.com', 'hash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run();
      await env.DB.prepare(`INSERT INTO itineraries
        (id, title, theme_id, palette_id, packing_enabled, prefecture_slugs, areas, tags, metadata_initialized, memo, created_at, updated_at)
        VALUES ('official-source', 'Source', 'standard-autumn', 'sakura', 1, '[]', '[]', '[]', 0, '{"text":""}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
               ('random-public-id', 'Official public itinerary', 'standard-autumn', 'sakura', 1, '[]', '[]', '[]', 0, '{"text":""}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run();
      await env.DB.prepare(`UPDATE itineraries SET source_itinerary_id = 'official-source' WHERE id = 'random-public-id'`).run();
      await env.DB.prepare(`INSERT INTO itinerary_publications
        (source_itinerary_id, shared_itinerary_id, user_id, prefecture_slugs, published_at, updated_at)
        VALUES ('official-source', 'random-public-id', 'official-user', '[]', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run();
      await env.DB.prepare(`INSERT INTO official_itinerary_aliases (alias, itinerary_id)
        VALUES ('official-spring-public', 'random-public-id')`).run();
      await env.DB.prepare(`INSERT INTO steps
        (id, itinerary_id, title, start_at, end_at, scheduled_start_at, scheduled_end_at,
          type, is_all_day, created_at, updated_at)
        VALUES ('official-step', 'random-public-id', 'Published step', 0, 0, 0, 0,
          'normal:general', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`).run();

      const response = await app.request('/api/v1/itineraries/official-spring-public', {}, env);

      expect(response.status).toBe(200);
      expect((await response.json() as any).data.id).toBe('random-public-id');

      const stepsResponse = await app.request('/api/v1/steps?itinerary_id=official-spring-public', {}, env);
      expect(stepsResponse.status).toBe(200);
      expect((await stepsResponse.json() as any).data).toHaveLength(1);
    });

    it('returns 404 for an unknown official alias', async () => {
      const response = await app.request('/api/v1/itineraries/official-missing-public', {}, env);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/itineraries/:id', () => {
    it('updates itinerary title without password protection', async () => {
      const createRequest = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Original Title' }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as any;

      const updateRequest = new Request(`http://localhost/api/v1/itineraries/${created.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      const response = await app.fetch(updateRequest, env);

      expect(response.status).toBe(200);
      const { data } = await response.json() as any;
      expect(data.title).toBe('Updated Title');
    });

    it('returns 404 for non-existent itinerary', async () => {
      const updateRequest = new Request('http://localhost/api/v1/itineraries/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });
      const response = await app.fetch(updateRequest, env);

      expect(response.status).toBe(404);
    });

    it('returns 403 when trying to edit a shared snapshot', async () => {
      const createRes = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'オリジナル' }),
      }), env);
      const { data: original } = await createRes.json() as any;

      const publishRes = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${original.id}/publish`, {
        method: 'POST',
      }), env);
      const { data: snapshot } = await publishRes.json() as any;

      const updateRes = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${snapshot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '改ざん' }),
      }), env);
      expect(updateRes.status).toBe(403);
      const { error } = await updateRes.json() as any;
      expect(error.code).toBe('FORBIDDEN');
    });

    it('does not issue an edit token for a shared snapshot', async () => {
      const createRes = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'オリジナル' }),
      }), env);
      const { data: original } = await createRes.json() as any;

      const publishRes = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${original.id}/publish`, {
        method: 'POST',
      }), env);
      const { data: snapshot } = await publishRes.json() as any;

      const authRes = await app.fetch(new Request('http://localhost/api/v1/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shioriId: snapshot.id, password: '' }),
      }), env);
      expect(authRes.status).toBe(403);
      const { error } = await authRes.json() as any;
      expect(error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/v1/itineraries/:id', () => {
    it('deletes itinerary without password protection', async () => {
      const createRequest = new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'To Delete' }),
      });
      const createResponse = await app.fetch(createRequest, env);
      const { data: created } = await createResponse.json() as any;

      const deleteRequest = new Request(`http://localhost/api/v1/itineraries/${created.id}`, {
        method: 'DELETE',
      });
      const response = await app.fetch(deleteRequest, env);

      expect(response.status).toBe(200);

      const getRequest = new Request(`http://localhost/api/v1/itineraries/${created.id}`);
      const getResponse = await app.fetch(getRequest, env);
      expect(getResponse.status).toBe(404);
    });

    it('deletes the published snapshot when its source itinerary is deleted', async () => {
      const createResponse = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '公開元' }),
      }), env);
      const { data: source } = await createResponse.json() as any;
      const publishResponse = await app.fetch(new Request(
        `http://localhost/api/v1/itineraries/${source.id}/publish`,
        { method: 'POST' },
      ), env);
      const { data: snapshot } = await publishResponse.json() as any;

      const deleteResponse = await app.fetch(new Request(
        `http://localhost/api/v1/itineraries/${source.id}`,
        { method: 'DELETE' },
      ), env);
      expect(deleteResponse.status).toBe(200);
      expect(await env.DB.prepare('SELECT id FROM itineraries WHERE id = ?').bind(snapshot.id).first()).toBeNull();
    });

    it('returns 404 for non-existent itinerary', async () => {
      const deleteRequest = new Request('http://localhost/api/v1/itineraries/nonexistent', {
        method: 'DELETE',
      });
      const response = await app.fetch(deleteRequest, env);

      expect(response.status).toBe(404);
    });

    it('returns 403 when trying to delete a shared snapshot', async () => {
      const createRes = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'オリジナル' }),
      }), env);
      const { data: original } = await createRes.json() as any;

      const publishRes = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${original.id}/publish`, {
        method: 'POST',
      }), env);
      const { data: snapshot } = await publishRes.json() as any;

      const deleteRes = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${snapshot.id}`, {
        method: 'DELETE',
      }), env);
      expect(deleteRes.status).toBe(403);
      const { error } = await deleteRes.json() as any;
      expect(error.code).toBe('FORBIDDEN');
    });
  });
});

describe('POST /api/v1/itineraries/:id/fork', () => {
  async function registerAndGetToken(username: string, email: string): Promise<string> {
    return (await insertVerifiedUser(env.DB, username, email)).token;
  }

  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM user_bookmarks').run();
    await env.DB.prepare('DELETE FROM steps').run();
    await env.DB.prepare('DELETE FROM itinerary_secrets').run();
    await env.DB.prepare('DELETE FROM itinerary_money_item_splits').run();
    await env.DB.prepare('DELETE FROM itinerary_money_items').run();
    await env.DB.prepare('DELETE FROM itinerary_money_fund_transactions').run();
    await env.DB.prepare('DELETE FROM itinerary_money_settings').run();
    await env.DB.prepare('DELETE FROM itinerary_members').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
    await env.DB.prepare('DELETE FROM users').run();
  });

  it('allows copying without an account', async () => {
    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Original' }),
    }, env);
    const { data: created } = await createRes.json() as any;

    const res = await app.request(`/api/v1/itineraries/${created.id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, env);
    expect(res.status).toBe(201);
  });

  it('forks a public itinerary and returns new itinerary with token', async () => {
    const token = await registerAndGetToken('forkuser', 'forkuser@example.com');

    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '旅のしおり', theme_id: 'standard-autumn' }),
    }, env);
    const { data: source } = await createRes.json() as any;

    const res = await app.request(`/api/v1/itineraries/${source.id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(201);
    const json = await res.json() as { success: boolean; data: { id: string; title: string; theme_id: string; token: string } };
    expect(json.success).toBe(true);
    expect(json.data.title).toBe('旅のしおり（コピー）');
    expect(json.data.theme_id).toBe('week');
    expect(json.data.token).toBeTruthy();
    expect(json.data.id).not.toBe(source.id);

  });

  it('increments fork_count on the source itinerary', async () => {
    const token = await registerAndGetToken('forkuser2', 'forkuser2@example.com');

    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'カウントテスト' }),
    }, env);
    const { data: source } = await createRes.json() as any;

    await app.request(`/api/v1/itineraries/${source.id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }, env);

    const row = await env.DB.prepare('SELECT fork_count FROM itinerary_fork_stats WHERE itinerary_id = ?').bind(source.id).first() as any;
    expect(row.fork_count).toBe(1);
  });

  it('copies steps from the source itinerary', async () => {
    const token = await registerAndGetToken('forkuser3', 'forkuser3@example.com');

    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'ステップ付き' }),
    }, env);
    const { data: source } = await createRes.json() as any;

    await app.request('/api/v1/steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itinerary_id: source.id, title: 'ステップ1', start_at: null, end_at: null,
        notes: '候補メモ', pin_latitude: 35, pin_longitude: 135,
        is_priority: true, sort_order: 7, link: 'https://example.com' }),
    }, env);

    const forkRes = await app.request(`/api/v1/itineraries/${source.id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }, env);
    const { data: forked } = await forkRes.json() as any;

    const stepsRes = await app.request(`/api/v1/steps?itinerary_id=${forked.id}`, {}, env);
    const stepsJson = await stepsRes.json() as any;
    expect(stepsJson.data).toHaveLength(1);
    expect(stepsJson.data[0].title).toBe('ステップ1');
    expect(stepsJson.data[0].itinerary_id).toBe(forked.id);
    expect(stepsJson.data[0]).toMatchObject({ start_at: null, end_at: null,
      pin_latitude: 35, pin_longitude: 135, is_priority: true, sort_order: 7,
      link: 'https://example.com/' });
    expect(stepsJson.data[0].notes).toBe('候補メモ');
  });

  it('returns 403 for password-protected itinerary', async () => {
    const token = await registerAndGetToken('forkuser4', 'forkuser4@example.com');

    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '秘密のしおり', password: 'secret123' }),
    }, env);
    const { data: source } = await createRes.json() as any;

    const res = await app.request(`/api/v1/itineraries/${source.id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(403);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 for non-existent itinerary', async () => {
    const token = await registerAndGetToken('forkuser5', 'forkuser5@example.com');

    const res = await app.request('/api/v1/itineraries/nonexistent-id/fork', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/itineraries/:id/publish', () => {
  beforeEach(async () => {
    await applyMigrations(env.DB);
    await env.DB.prepare('DELETE FROM steps').run();
    await env.DB.prepare('DELETE FROM itinerary_secrets').run();
    await env.DB.prepare('DELETE FROM itinerary_money_item_splits').run();
    await env.DB.prepare('DELETE FROM itinerary_money_items').run();
    await env.DB.prepare('DELETE FROM itinerary_money_fund_transactions').run();
    await env.DB.prepare('DELETE FROM itinerary_money_settings').run();
    await env.DB.prepare('DELETE FROM itinerary_members').run();
    await env.DB.prepare('DELETE FROM itineraries').run();
    await env.DB.prepare('DELETE FROM users').run();
  });

  it('creates a shared snapshot from a public itinerary', async () => {
    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '旅のしおり', memo: 'メモ' }),
    }, env);
    const { data: original } = await createRes.json() as any;

    const publishRes = await app.request(`/api/v1/itineraries/${original.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, env);
    expect(publishRes.status).toBe(200);

    const { success, data } = await publishRes.json() as any;
    expect(success).toBe(true);
    expect(data.id).toBeDefined();
    expect(data.id).not.toBe(original.id);

    const snapshotRes = await app.request(`/api/v1/itineraries/${data.id}`, {}, env);
    const { data: snapshot } = await snapshotRes.json() as any;
    expect(snapshot.title).toBe('旅のしおり');
    expect(snapshot.source_itinerary_id).toBe(original.id);
  });

  it('masks trip member names in a shared snapshot', async () => {
    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '山田太郎と山田の旅行',
        memo: '代表者は山田太郎です',
        theme_id: 'standard-autumn',
      }),
    }, env);
    const { data: original } = await createRes.json() as any;

    await env.DB.batch([
      env.DB.prepare('INSERT INTO itinerary_members (id, itinerary_id, name, created_at) VALUES (?, ?, ?, ?)')
        .bind('member-yamada', original.id, '山田', new Date().toISOString()),
      env.DB.prepare('INSERT INTO itinerary_members (id, itinerary_id, name, created_at) VALUES (?, ?, ?, ?)')
        .bind('member-yamada-taro', original.id, '山田太郎', new Date().toISOString()),
    ]);
    await app.request('/api/v1/steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itinerary_id: original.id,
        title: '山田太郎と集合',
        start_at: 1700000000000,
        end_at: 1700003600000,
        location: '山田の自宅',
        notes: '山田太郎に連絡',
      }),
    }, env);

    const publishRes = await app.request(`/api/v1/itineraries/${original.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, env);
    const { data: published } = await publishRes.json() as any;
    const snapshotRes = await app.request(`/api/v1/itineraries/${published.id}`, {}, env);
    const { data: snapshot } = await snapshotRes.json() as any;
    const stepsRes = await app.request(`/api/v1/steps?itinerary_id=${published.id}`, {}, env);
    const { data: steps } = await stepsRes.json() as any;

    expect(snapshot.title).toBe('[非公開]と[非公開]の旅行');
    expect(snapshot.memo).not.toContain('山田');
    expect(steps[0].title).toBe('[非公開]と集合');
    expect(steps[0].location).toBe('[非公開]の自宅');
    expect(steps[0].notes).not.toContain('山田');
  });

  it('publishes an anonymous money snapshot without exposing private member data', async () => {
    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: '会計付きしおり',
        secret_settings: { enabled: true, offset_minutes: 90 },
      }),
    }, env);
    const { data: original } = await createRes.json() as any;
    const stepRes = await app.request('/api/v1/steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itinerary_id: original.id,
        title: 'ホテル',
        start_at: 1700000000000,
        end_at: 1700003600000,
      }),
    }, env);
    const { data: sourceStep } = await stepRes.json() as any;
    const now = new Date().toISOString();
    await env.DB.batch([
      env.DB.prepare('INSERT INTO itinerary_members (id, itinerary_id, name, created_at) VALUES (?, ?, ?, ?)')
        .bind('private-member-a', original.id, '山田太郎', now),
      env.DB.prepare('INSERT INTO itinerary_members (id, itinerary_id, name, created_at) VALUES (?, ?, ?, ?)')
        .bind('private-member-b', original.id, '佐藤花子', now),
      env.DB.prepare('INSERT INTO itinerary_money_settings (itinerary_id, budget_amount, created_at, updated_at) VALUES (?, ?, ?, ?)')
        .bind(original.id, 100000, now, now),
      env.DB.prepare(`INSERT INTO itinerary_money_items
        (id, itinerary_id, title, amount, paid_by_member_id, paid_from_fund, status, is_settled,
         occurred_on, step_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind('private-item', original.id, '山田太郎の宿泊費 test@example.com', 24000,
          'private-member-a', 0, 'paid', 1, '2026-10-10', sourceStep.id, now, now),
      env.DB.prepare('INSERT INTO itinerary_money_item_splits (item_id, member_id, itinerary_id, amount) VALUES (?, ?, ?, ?)')
        .bind('private-item', 'private-member-a', original.id, 12000),
      env.DB.prepare('INSERT INTO itinerary_money_item_splits (item_id, member_id, itinerary_id, amount) VALUES (?, ?, ?, ?)')
        .bind('private-item', 'private-member-b', original.id, 12000),
      env.DB.prepare(`INSERT INTO itinerary_money_fund_transactions
        (id, itinerary_id, member_id, kind, amount, note, occurred_on, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        'private-fund', original.id, 'private-member-b', 'contribution', 10000,
        '佐藤花子の口座 090-1234-5678', '2026-10-01', now,
      ),
    ]);

    const publishRes = await app.request(`/api/v1/itineraries/${original.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, env);
    expect(publishRes.status).toBe(200);
    const { data: published } = await publishRes.json() as any;

    const publicMoneyRes = await app.request(`/api/v1/itineraries/${published.id}/money`, {}, env);
    expect(publicMoneyRes.status).toBe(200);
    const { data: publicMoney } = await publicMoneyRes.json() as any;
    expect(publicMoney.budget_amount).toBe(100000);
    expect(publicMoney.members.map((member: { name: string }) => member.name)).toEqual(['Aさん', 'Bさん']);
    expect(publicMoney.items).toHaveLength(1);
    expect(publicMoney.items[0]).toMatchObject({
      amount: 24000, status: 'paid', is_settled: true, paid_from_fund: false,
    });
    expect(publicMoney.items[0].paid_by_member_id).toBe(publicMoney.members[0].id);
    expect(publicMoney.items[0].splits).toEqual([
      { member_id: publicMoney.members[0].id, amount: 12000 },
      { member_id: publicMoney.members[1].id, amount: 12000 },
    ]);
    expect(publicMoney.items[0].title).not.toContain('山田太郎');
    expect(publicMoney.items[0].title).not.toContain('test@example.com');
    expect(publicMoney.items[0].step_id).not.toBe(sourceStep.id);
    expect(publicMoney.fund_transactions).toHaveLength(1);
    expect(publicMoney.fund_transactions[0]).toMatchObject({
      member_id: publicMoney.members[1].id, kind: 'contribution', amount: 10000, note: null,
    });
    expect(JSON.stringify(publicMoney)).not.toContain('山田太郎');
    expect(JSON.stringify(publicMoney)).not.toContain('佐藤花子');
    expect(JSON.stringify(publicMoney)).not.toContain('090-1234-5678');

    const sourceMembersRes = await app.request(`/api/v1/itineraries/${original.id}/members`, {}, env);
    expect(sourceMembersRes.status).toBe(200);
    expect((await sourceMembersRes.json() as any).data.map((member: { name: string }) => member.name))
      .toEqual(['山田太郎', '佐藤花子']);

    const sourceMoneyRes = await app.request(`/api/v1/itineraries/${original.id}/money`, {}, env);
    expect(sourceMoneyRes.status).toBe(200);
    expect((await sourceMoneyRes.json() as any).data.items[0].title).toContain('山田太郎');

    const sourcePackingRes = await app.request(`/api/v1/itineraries/${original.id}/packing`, {}, env);
    expect(sourcePackingRes.status).toBe(200);
    const privateItineraryRes = await app.request(`/api/v1/itineraries/${original.id}`, {}, env);
    expect((await privateItineraryRes.json() as any).data.secret_settings).toBeUndefined();
    const ownedItineraryRes = await app.request(`/api/v1/itineraries/${original.id}`, {
      headers: { Authorization: `Bearer ${original.token}` },
    }, env);
    expect((await ownedItineraryRes.json() as any).data.secret_settings).toEqual({
      enabled: true, offset_minutes: 90,
    });

    const privateMoneyRes = await app.request(`/api/v1/itineraries/${original.id}/money`, {
      headers: { Authorization: `Bearer ${original.token}` },
    }, env);
    expect(privateMoneyRes.status).toBe(200);
    expect((await privateMoneyRes.json() as any).data.members[0].name).toBe('山田太郎');

    await env.DB.prepare('UPDATE itinerary_money_items SET amount = ?, title = ? WHERE id = ?')
      .bind(30000, '更新後の宿泊費', 'private-item').run();
    await env.DB.prepare('UPDATE itinerary_money_item_splits SET amount = ? WHERE item_id = ?')
      .bind(15000, 'private-item').run();
    const republishRes = await app.request(`/api/v1/itineraries/${original.id}/publish`, {
      method: 'POST', headers: { Authorization: `Bearer ${original.token}` },
    }, env);
    expect(republishRes.status).toBe(200);
    expect((await republishRes.json() as any).data.id).toBe(published.id);
    const republishedMoneyRes = await app.request(`/api/v1/itineraries/${published.id}/money`, {}, env);
    const { data: republishedMoney } = await republishedMoneyRes.json() as any;
    expect(republishedMoney.members.map((member: { name: string }) => member.name)).toEqual(['Aさん', 'Bさん']);
    expect(republishedMoney.items).toHaveLength(1);
    expect(republishedMoney.items[0]).toMatchObject({ title: '更新後の宿泊費', amount: 30000 });
    expect(republishedMoney.items[0].splits.map((split: { amount: number }) => split.amount)).toEqual([15000, 15000]);
  });

  it('is idempotent — calling publish again updates the snapshot', async () => {
    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '初期タイトル' }),
    }, env);
    const { data: original } = await createRes.json() as any;

    const firstPublish = await app.request(`/api/v1/itineraries/${original.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, env);
    const { data: first } = await firstPublish.json() as any;

    await app.request(`/api/v1/itineraries/${original.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${original.token}` },
      body: JSON.stringify({ title: '更新後タイトル' }),
    }, env);

    const secondPublish = await app.request(`/api/v1/itineraries/${original.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${original.token}` },
    }, env);
    expect(secondPublish.status).toBe(200);
    const { data: second } = await secondPublish.json() as any;

    expect(second.id).toBe(first.id);

    const snapshotRes = await app.request(`/api/v1/itineraries/${second.id}`, {}, env);
    const { data: snapshot } = await snapshotRes.json() as any;
    expect(snapshot.title).toBe('更新後タイトル');
  });

  it('copies steps to the shared snapshot', async () => {
    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'ステップ付きしおり' }),
    }, env);
    const { data: original } = await createRes.json() as any;

    await app.request('/api/v1/steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itinerary_id: original.id, title: '観光スポット', start_at: 1700000000000,
        end_at: 1700003600000, time_unspecified: true, notes: '公開メモ',
        pin_latitude: 35, pin_longitude: 135, is_priority: true, sort_order: 8 }),
    }, env);

    const publishRes = await app.request(`/api/v1/itineraries/${original.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, env);
    const { data: pub } = await publishRes.json() as any;

    const stepsRes = await app.request(`/api/v1/steps?itinerary_id=${pub.id}`, {}, env);
    const { data: steps } = await stepsRes.json() as any;
    expect(steps).toHaveLength(1);
    expect(steps[0].title).toBe('観光スポット');
    expect(steps[0].itinerary_id).toBe(pub.id);
    expect(steps[0]).toMatchObject({ start_at: 1700000000000, end_at: 1700003600000,
      time_unspecified: true, pin_latitude: 35, pin_longitude: 135,
      is_priority: true, sort_order: 8 });
    expect(steps[0].notes).toBe('公開メモ');
  });

  it('publishes sanitized plain-text notes without embedding affiliate metadata', async () => {
    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'ホテル付きしおり',
        memo: '連絡先 test@example.com',
      }),
    }, env);
    const { data: original } = await createRes.json() as any;

    await app.request('/api/v1/steps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itinerary_id: original.id,
        title: '京都ホテル 予約番号 ABCD1234',
        start_at: 1700000000000,
        end_at: 1700003600000,
        location: '京都駅 090-1234-5678',
        type: 'normal:hotel',
        link: 'https://www.jalan.net/yad123/?foo=bar',
        notes: '部屋番号 1002。予約番号 ABCD1234',
      }),
    }, env);

    const publishRes = await app.request(`/api/v1/itineraries/${original.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, {
      ...env,
      AFFILIATE_TEMPLATE_JALAN: 'https://affiliate.example/click?url={encodedUrl}',
    });
    const { data: pub } = await publishRes.json() as any;

    const snapshotRes = await app.request(`/api/v1/itineraries/${pub.id}`, {}, env);
    const { data: snapshot } = await snapshotRes.json() as any;
    expect(snapshot.memo).not.toContain('test@example.com');

    const stepsRes = await app.request(`/api/v1/steps?itinerary_id=${pub.id}`, {}, env);
    const { data: steps } = await stepsRes.json() as any;
    expect(steps[0].title).toContain('京都ホテル');
    expect(steps[0].title).not.toContain('ABCD1234');
    expect(steps[0].location).not.toContain('090-1234-5678');
    expect(steps[0].link).toBe('https://www.jalan.net/yad123/?foo=bar');

    expect(steps[0].notes).not.toContain('1002');
    expect(steps[0].notes).not.toContain('ABCD1234');
    expect(steps[0].notes).not.toContain('affiliate');
  });

  it('returns 403 when publishing a shared snapshot', async () => {
    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'オリジナル' }),
    }, env);
    const { data: original } = await createRes.json() as any;

    const publishRes = await app.request(`/api/v1/itineraries/${original.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, env);
    const { data: snapshot } = await publishRes.json() as any;

    const rePub = await app.request(`/api/v1/itineraries/${snapshot.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, env);
    expect(rePub.status).toBe(403);
    const json = await rePub.json() as { error: { code: string } };
    expect(json.error.code).toBe('FORBIDDEN');
  });

  it('returns 404 for non-existent itinerary', async () => {
    const res = await app.request('/api/v1/itineraries/nonexistent-id/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, env);
    expect(res.status).toBe(404);
  });

  it('returns 403 for password-protected itinerary without valid token', async () => {
    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '秘密のしおり', password: 'secret123' }),
    }, env);
    const { data: original } = await createRes.json() as any;

    const res = await app.request(`/api/v1/itineraries/${original.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, env);
    expect(res.status).toBe(403);
    const json = await res.json() as { error: { code: string } };
    expect(json.error.code).toBe('FORBIDDEN');
  });

  it('publishes a password-protected itinerary with valid shiori token', async () => {
    const createRes = await app.request('/api/v1/itineraries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '秘密のしおり', password: 'secret123' }),
    }, env);
    const { data: original } = await createRes.json() as any;

    const res = await app.request(`/api/v1/itineraries/${original.id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${original.token}` },
    }, env);
    expect(res.status).toBe(200);

    const { success, data } = await res.json() as any;
    expect(success).toBe(true);
    expect(data.id).toBeDefined();
  });
});
