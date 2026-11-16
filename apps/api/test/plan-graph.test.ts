import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index';
import { generateToken } from '../src/utils/jwt';

const now = '2026-11-16T00:00:00.000Z';
async function setup() {
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS itineraries (id TEXT PRIMARY KEY, title TEXT NOT NULL, theme_id TEXT NOT NULL, password TEXT, source_itinerary_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS itinerary_secrets (itinerary_id TEXT PRIMARY KEY, enabled INTEGER, offset_minutes INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS itinerary_fork_stats (itinerary_id TEXT PRIMARY KEY, fork_count INTEGER NOT NULL DEFAULT 0)").run();
  await env.DB.prepare("CREATE TABLE IF NOT EXISTS itinerary_plan_graphs (itinerary_id TEXT PRIMARY KEY, nodes_json TEXT NOT NULL, edges_json TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL)").run();
  await env.DB.prepare('DELETE FROM itinerary_plan_graphs').run();
  await env.DB.prepare('DELETE FROM itineraries').run();
}
async function trip(password: string | null = null, published = false) {
  const id = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO itineraries (id,title,theme_id,password,source_itinerary_id,created_at,updated_at) VALUES (?, 'Test', 'planning-draft', ?, ?, ?, ?)")
    .bind(id, password, published ? 'source' : null, now, now).run();
  return { id, token: await generateToken(id, env.JWT_SECRET) };
}
function request(id: string, method = 'GET', body?: unknown, token?: string) {
  return app.request('/api/v1/itineraries/' + id + '/plan-graph', {
    method, headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }, env);
}
const node = (id: string, time: string) => ({
  id, kind: 'step', title: '予定' + id, type: 'normal:general',
  start_local: time, end_local: '', location: '京都', notes: 'メモ', link: '',
  amount: null, currency: 'JPY', participants: [], options: [], selected_option_id: null,
});
const edge = (id: string, from: string, to: string) => ({ id, from, to, label: 'プラン ' + id });

describe('Branching plan graph API', () => {
  beforeEach(setup);

  it('accepts independent starts, multiple splits and different merges', async () => {
    const { id } = await trip();
    const initial = await request(id);
    expect(initial.status).toBe(200);
    expect((await initial.json() as any).data.revision).toBe(0);
    const nodes = ['a','b','c','d','ac','bd','end'].map((key, i) => node(key, '2026-12-10T' + String(8 + (i < 4 ? 0 : i - 3)).padStart(2,'0') + ':00'));
    const edges = [
      edge('1','a','ac'), edge('2','c','ac'), edge('3','b','bd'), edge('4','d','bd'),
      edge('5','ac','end'), edge('6','bd','end'),
    ];
    const saved = await request(id, 'PUT', { revision: 0, nodes, edges });
    expect(saved.status).toBe(200);
    expect((await saved.json() as any).data.revision).toBe(1);
    const conflict = await request(id, 'PUT', { revision: 0, nodes, edges });
    expect(conflict.status).toBe(409);
    const reloaded = await request(id);
    expect((await reloaded.json() as any).data.edges).toHaveLength(6);
  });

  it('rejects cycles, backward time, invalid links and orphan nodes', async () => {
    const { id } = await trip();
    const nodes = [node('a','2026-12-10T10:00'), node('b','2026-12-10T11:00')];
    for (const edges of [
      [edge('x','a','b'),edge('y','b','a')],
      [edge('x','b','a')],
      [edge('x','a','missing')],
      [edge('x','a','a')],
    ]) {
      const r = await request(id, 'PUT', { revision: 0, nodes, edges });
      expect(r.status).toBe(400);
    }
    expect((await request(id).then(r => r.json()) as any).data.revision).toBe(0);
  });

  it('requires protected itinerary tokens; public snapshots are read-only', async () => {
    const protectedTrip = await trip('secret');
    const body = { revision: 0, nodes: [node('a','')], edges: [] };
    expect((await request(protectedTrip.id)).status).toBe(403);
    expect((await request(protectedTrip.id, 'PUT', body)).status).toBe(403);
    expect((await request(protectedTrip.id, 'PUT', body, protectedTrip.token)).status).toBe(200);
    const published = await trip(null, true);
    expect((await request(published.id)).status).toBe(200);
    expect((await request(published.id, 'PUT', body)).status).toBe(403);
  });

  it('validates per-node Step-like fields and choice options', async () => {
    const { id } = await trip();
    const bad = node('a', '');
    expect((await request(id, 'PUT', { revision: 0, nodes: [{ ...bad, link: 'javascript:alert(1)' }], edges: [] })).status).toBe(400);
    expect((await request(id, 'PUT', { revision: 0, nodes: [{ ...bad, selected_option_id: 'missing' }], edges: [] })).status).toBe(400);
    expect((await request(id, 'PUT', { revision: 0, nodes: [{ ...bad, participants: Array(21).fill('A') }], edges: [] })).status).toBe(400);
  });
});
