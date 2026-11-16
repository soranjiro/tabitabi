import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index';
import { generateToken } from '../src/utils/jwt';

const now = '2026-11-16T00:00:00.000Z';

async function setup() {
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS itineraries (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, theme_id TEXT NOT NULL,
    memo TEXT, memo_text TEXT, password TEXT, source_itinerary_id TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS itinerary_secrets (
    itinerary_id TEXT PRIMARY KEY, enabled INTEGER, offset_minutes INTEGER,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS itinerary_fork_stats (
    itinerary_id TEXT PRIMARY KEY, fork_count INTEGER NOT NULL DEFAULT 0
  )`).run();
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS itinerary_comparison_groups (
    id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL,
    title TEXT NOT NULL, kind TEXT NOT NULL, options_json TEXT NOT NULL,
    selected_option_id TEXT, revision INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE
  )`).run();
  await env.DB.prepare('DELETE FROM itinerary_comparison_groups').run();
  await env.DB.prepare('DELETE FROM itineraries').run();
}

function request(path: string, method: string = 'GET', body?: unknown, token?: string) {
  return app.request('/api/v1/itineraries/' + path, {
    method, headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }, env);
}

async function makeTrip(password: string | null = null, snapshot = false) {
  const id = crypto.randomUUID();
  await env.DB.prepare(`INSERT INTO itineraries
    (id, title, theme_id, password, source_itinerary_id, created_at, updated_at)
    VALUES (?, 'Test trip', 'planning-draft', ?, ?, ?, ?)`)
    .bind(id, password, snapshot ? 'source' : null, now, now).run();
  return { id, token: await generateToken(id, env.JWT_SECRET) };
}

const option = {
  id: 'flight-1', title: '直行便', provider: 'Airline',
  amount: 30000, currency: 'JPY',
  start_local: '2026-12-10T08:00', end_local: '2026-12-10T09:30',
  from: 'KIX', to: 'HND', cancellation: '不可',
  url: 'https://example.com/flight', notes: '手荷物込み',
};

describe('Planning comparisons API', () => {
  beforeEach(setup);

  it('creates groups, saves multiple options, picks one and detects lost updates', async () => {
    const { id, token } = await makeTrip('protected');
    const path = id + '/comparisons';

    const denied = await request(path, 'POST', { title: '往路', kind: 'flight' });
    expect(denied.status).toBe(403);

    const created = await request(path, 'POST', { title: '往路', kind: 'flight' }, token);
    expect(created.status).toBe(201);
    const group = (await created.json() as any).data;
    expect(group.options).toEqual([]);

    const next = await request(path + '/' + group.id, 'PUT', {
      revision: group.revision, options: [option, { ...option, id: 'flight-2', amount: 20000 }],
      selected_option_id: 'flight-2',
    }, token);
    expect(next.status).toBe(200);
    expect((await next.json() as any).data).toMatchObject({
      revision: 2, selected_option_id: 'flight-2',
    });

    const conflict = await request(path + '/' + group.id, 'PUT', {
      revision: 1, title: '古い変更',
    }, token);
    expect(conflict.status).toBe(409);

    const list = await request(path, 'GET', undefined, token);
    expect(list.status).toBe(200);
    const [saved] = (await list.json() as any).data;
    expect(saved.title).toBe('往路');
    expect(saved.options).toHaveLength(2);
    expect(saved.options[1].amount).toBe(20000);

    const anonymous = await request(path);
    expect(anonymous.status).toBe(403);
  });

  it('rejects non-http links and selecting an option outside the group', async () => {
    const { id } = await makeTrip();
    const path = id + '/comparisons';
    const created = await request(path, 'POST', { title: '宿泊', kind: 'stay' });
    const group = (await created.json() as any).data;

    const invalidUrl = await request(path + '/' + group.id, 'PUT', {
      revision: 1, options: [{ ...option, url: 'javascript:alert(1)' }],
    });
    expect(invalidUrl.status).toBe(400);

    const invalidSelection = await request(path + '/' + group.id, 'PUT', {
      revision: 1, selected_option_id: 'missing-option',
    });
    expect(invalidSelection.status).toBe(400);

    const list = await request(path);
    expect((await list.json() as any).data[0].revision).toBe(1);
  });

  it('does not expose comparisons on published snapshots', async () => {
    const { id } = await makeTrip(null, true);
    expect((await request(id + '/comparisons')).status).toBe(403);
    expect((await request(id + '/comparisons', 'POST', { title: '宿', kind: 'stay' })).status).toBe(403);
  });

  it('scopes group mutations to their itinerary and supports deletion', async () => {
    const one = await makeTrip();
    const other = await makeTrip();
    const created = await request(one.id + '/comparisons', 'POST', { title: '宿', kind: 'stay' });
    const group = (await created.json() as any).data;
    expect((await request(other.id + '/comparisons/' + group.id, 'DELETE')).status).toBe(404);
    expect((await request(one.id + '/comparisons/' + group.id, 'DELETE')).status).toBe(200);
    expect((await request(one.id + '/comparisons').then((r) => r.json()) as any).data).toEqual([]);
  });
});
