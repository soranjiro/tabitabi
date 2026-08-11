import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index';

async function setup() {
  const migrations = [
    `CREATE TABLE IF NOT EXISTS itineraries (id TEXT PRIMARY KEY, title TEXT NOT NULL, theme_id TEXT NOT NULL, default_view_mode TEXT NOT NULL DEFAULT 'dayCard', memo TEXT, password TEXT, source_itinerary_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS itinerary_secrets (itinerary_id TEXT PRIMARY KEY, enabled INTEGER, offset_minutes INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS itinerary_walica_settings (itinerary_id TEXT PRIMARY KEY, walica_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS itinerary_fork_stats (itinerary_id TEXT PRIMARY KEY, fork_count INTEGER NOT NULL DEFAULT 0);`,
    `CREATE TABLE IF NOT EXISTS itinerary_money_settings (itinerary_id TEXT PRIMARY KEY, budget_amount INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS itinerary_members (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS itinerary_money_members (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS itinerary_money_items (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, title TEXT NOT NULL, amount INTEGER NOT NULL, paid_by_member_id TEXT, status TEXT NOT NULL, is_settled INTEGER NOT NULL DEFAULT 0, occurred_on TEXT, step_id TEXT, split_member_ids TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS itinerary_packing_items (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, kind TEXT NOT NULL, group_id TEXT, assignee_member_id TEXT, is_packed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS itinerary_packing_groups (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, name TEXT NOT NULL, sort_order INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS itinerary_packing_checks (item_id TEXT NOT NULL, member_id TEXT NOT NULL, checked_at TEXT NOT NULL, PRIMARY KEY (item_id, member_id));`,
  ];
  for (const sql of migrations) await env.DB.prepare(sql).run();
  await env.DB.prepare('DELETE FROM itinerary_money_items').run();
  await env.DB.prepare('DELETE FROM itinerary_packing_checks').run();
  await env.DB.prepare('DELETE FROM itinerary_packing_items').run();
  await env.DB.prepare('DELETE FROM itinerary_packing_groups').run();
  await env.DB.prepare('DELETE FROM itinerary_members').run();
  await env.DB.prepare('DELETE FROM itinerary_money_members').run();
  await env.DB.prepare('DELETE FROM itinerary_money_settings').run();
  await env.DB.prepare('DELETE FROM itinerary_secrets').run();
  await env.DB.prepare('DELETE FROM itinerary_walica_settings').run();
  await env.DB.prepare('DELETE FROM itinerary_fork_stats').run();
  await env.DB.prepare('DELETE FROM itineraries').run();
}

describe('Money API', () => {
  beforeEach(setup);

  it('stores paid and planned expenses against trip members', async () => {
    const create = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '会計テスト' }),
    }), env);
    const { data: itinerary } = await create.json() as any;
    const addMember = async (name: string) => {
      const response = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      }), env);
      return (await response.json() as any).data;
    };
    const alice = await addMember('Alice');
    const bob = await addMember('Bob');
    const itemResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'ホテル', amount: 12000, status: 'paid', paid_by_member_id: alice.id, split_member_ids: [alice.id, bob.id] }),
    }), env);
    expect(itemResponse.status).toBe(201);
    const paidExpense = (await itemResponse.json() as any).data;

    const individualPaidResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '拝観料', amount: 3600, status: 'paid', paid_by_member_id: null, split_member_ids: [alice.id, bob.id] }),
    }), env);
    expect(individualPaidResponse.status).toBe(201);
    const individualPaid = (await individualPaidResponse.json() as any).data;

    const individualPlannedResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '現地交通費', amount: 3600, status: 'planned', paid_by_member_id: null, split_member_ids: [alice.id, bob.id] }),
    }), env);
    expect(individualPlannedResponse.status).toBe(201);
    const individualPlanned = (await individualPlannedResponse.json() as any).data;

    const invalidSettlementResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/items/${individualPlanned.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_settled: true }),
    }), env);
    expect(invalidSettlementResponse.status).toBe(400);

    const moneyResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money`), env);
    const { data } = await moneyResponse.json() as any;
    expect(data.members.map((member: { name: string }) => member.name)).toEqual(['Alice', 'Bob']);
    expect(data.items.find((item: { id: string }) => item.id === paidExpense.id)).toMatchObject({ title: 'ホテル', amount: 12000, status: 'paid', is_settled: false, split_member_ids: [alice.id, bob.id] });
    expect(data.items.find((item: { id: string }) => item.id === individualPaid.id)).toMatchObject({ title: '拝観料', status: 'paid', paid_by_member_id: null, is_settled: false });
    expect(data.items.find((item: { id: string }) => item.id === individualPlanned.id)).toMatchObject({ status: 'planned', paid_by_member_id: null, is_settled: false });

    const settleResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/items/${paidExpense.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_settled: true }),
    }), env);
    expect(settleResponse.status).toBe(200);
    expect((await settleResponse.json() as any).data).toMatchObject({ is_settled: true, paid_by_member_id: alice.id });
  });

  it('renames an unused member and allows deleting them', async () => {
    const create = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'メンバー編集テスト' }),
    }), env);
    const { data: itinerary } = await create.json() as any;
    const addResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Alice' }),
    }), env);
    const { data: member } = await addResponse.json() as any;

    const renameResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/members/${member.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Alicia' }),
    }), env);
    expect(renameResponse.status).toBe(200);
    expect((await renameResponse.json() as any).data).toMatchObject({ id: member.id, name: 'Alicia' });

    const deleteResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/members/${member.id}`, { method: 'DELETE' }), env);
    expect(deleteResponse.status).toBe(200);
    const moneyResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money`), env);
    expect((await moneyResponse.json() as any).data.members).toEqual([]);
  });
});

describe('Packing API', () => {
  beforeEach(setup);

  it('shares trip members and keeps personal checks separate per member', async () => {
    const create = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '持ち物テスト' }),
    }), env);
    const { data: itinerary } = await create.json() as any;
    const addMember = async (name: string) => {
      const response = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/members`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      }), env);
      return (await response.json() as any).data;
    };
    const alice = await addMember('Alice');
    const bob = await addMember('Bob');
    const initialPackingResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing`), env);
    const initialPacking = (await initialPackingResponse.json() as any).data;
    expect(initialPacking.groups.map((group: { name: string }) => group.name)).toEqual(['貴重品', 'スマホ・電子機器', '洗面・ケアアイテム', '衣類', 'その他']);
    const valuables = initialPacking.groups[0];
    const personalResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'パスポート', quantity: 2, kind: 'personal', group_id: valuables.id }),
    }), env);
    const personal = (await personalResponse.json() as any).data;
    expect(personalResponse.status).toBe(201);

    await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/items/${personal.id}/check`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: alice.id, checked: true }),
    }), env);
    const sharedResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'カメラ', kind: 'shared', group_id: initialPacking.groups[1].id, assignee_member_id: bob.id }),
    }), env);
    const shared = (await sharedResponse.json() as any).data;
    await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/items/${shared.id}/check`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ checked: true }),
    }), env);

    const response = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing`), env);
    const { data } = await response.json() as any;
    expect(data.members.map((member: { name: string }) => member.name)).toEqual(['Alice', 'Bob']);
    expect(data.items.find((item: { id: string }) => item.id === personal.id)).toMatchObject({ quantity: 2, checked_member_ids: [alice.id], is_packed: false });
    expect(data.items.find((item: { id: string }) => item.id === shared.id)).toMatchObject({ assignee_member_id: bob.id, is_packed: true });
  });

  it('creates, renames, and deletes packing groups while preserving their items', async () => {
    const create = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'グループテスト' }),
    }), env);
    const { data: itinerary } = await create.json() as any;
    await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing`), env);
    const add = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/groups`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'アウトドア' }),
    }), env);
    const group = (await add.json() as any).data;
    expect(add.status).toBe(201);
    const rename = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/groups/${group.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: '登山用品' }),
    }), env);
    expect((await rename.json() as any).data.name).toBe('登山用品');
    const itemResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'トレッキングポール', kind: 'personal', group_id: group.id }),
    }), env);
    const item = (await itemResponse.json() as any).data;
    const remove = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/groups/${group.id}`, { method: 'DELETE' }), env);
    const reassignedTo = (await remove.json() as any).data.reassigned_to_group_id;
    const result = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing`), env);
    const packingData = (await result.json() as any).data;
    expect(packingData.groups.some((current: { id: string }) => current.id === group.id)).toBe(false);
    expect(packingData.items.find((current: { id: string }) => current.id === item.id).group_id).toBe(reassignedTo);
  });
});
