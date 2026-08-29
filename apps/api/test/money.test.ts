import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../src/index';

async function setup() {
  const migrations = [
    `CREATE TABLE IF NOT EXISTS itineraries (id TEXT PRIMARY KEY, title TEXT NOT NULL, theme_id TEXT NOT NULL, default_view_mode TEXT NOT NULL DEFAULT 'dayCard', packing_enabled INTEGER NOT NULL DEFAULT 1, prefecture_slugs TEXT NOT NULL DEFAULT '[]', areas TEXT NOT NULL DEFAULT '[]', tags TEXT NOT NULL DEFAULT '[]', metadata_initialized INTEGER NOT NULL DEFAULT 0, memo TEXT, password TEXT, source_itinerary_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);`,
    `CREATE TABLE IF NOT EXISTS itinerary_secrets (itinerary_id TEXT PRIMARY KEY, enabled INTEGER, offset_minutes INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE);`,
    `CREATE TABLE IF NOT EXISTS itinerary_fork_stats (itinerary_id TEXT PRIMARY KEY, fork_count INTEGER NOT NULL DEFAULT 0, FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE);`,
    `CREATE TABLE IF NOT EXISTS itinerary_money_settings (itinerary_id TEXT PRIMARY KEY, budget_amount INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE);`,
    `CREATE TABLE IF NOT EXISTS itinerary_members (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, name TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(id, itinerary_id), FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE);`,
    `CREATE TABLE IF NOT EXISTS steps (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, title TEXT NOT NULL, start_at INTEGER NOT NULL, end_at INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE);`,
    `CREATE TABLE IF NOT EXISTS itinerary_money_items (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, title TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount > 0), paid_by_member_id TEXT, paid_from_fund INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL CHECK(status IN ('paid', 'planned')), is_settled INTEGER NOT NULL DEFAULT 0, occurred_on TEXT, step_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(id, itinerary_id), FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE, FOREIGN KEY (paid_by_member_id, itinerary_id) REFERENCES itinerary_members(id, itinerary_id) ON DELETE RESTRICT, FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE SET NULL);`,
    `CREATE TABLE IF NOT EXISTS itinerary_money_item_splits (item_id TEXT NOT NULL, member_id TEXT NOT NULL, itinerary_id TEXT NOT NULL, amount INTEGER CHECK(amount > 0), PRIMARY KEY (item_id, member_id), FOREIGN KEY (item_id, itinerary_id) REFERENCES itinerary_money_items(id, itinerary_id) ON DELETE CASCADE, FOREIGN KEY (member_id, itinerary_id) REFERENCES itinerary_members(id, itinerary_id) ON DELETE RESTRICT);`,
    `CREATE TABLE IF NOT EXISTS itinerary_money_fund_transactions (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, member_id TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('contribution', 'refund')), amount INTEGER NOT NULL CHECK(amount > 0), note TEXT, occurred_on TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE, FOREIGN KEY (member_id, itinerary_id) REFERENCES itinerary_members(id, itinerary_id) ON DELETE RESTRICT);`,
    `CREATE TABLE IF NOT EXISTS itinerary_packing_groups (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, name TEXT NOT NULL, sort_order INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(id, itinerary_id), FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE);`,
    `CREATE TABLE IF NOT EXISTS itinerary_packing_items (id TEXT PRIMARY KEY, itinerary_id TEXT NOT NULL, name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1, kind TEXT NOT NULL, group_id TEXT NOT NULL, assignee_member_id TEXT, owner_member_id TEXT, is_packed INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(id, itinerary_id), FOREIGN KEY (itinerary_id) REFERENCES itineraries(id) ON DELETE CASCADE, FOREIGN KEY (group_id, itinerary_id) REFERENCES itinerary_packing_groups(id, itinerary_id) ON DELETE RESTRICT, FOREIGN KEY (assignee_member_id) REFERENCES itinerary_members(id) ON DELETE SET NULL, FOREIGN KEY (owner_member_id, itinerary_id) REFERENCES itinerary_members(id, itinerary_id) ON DELETE CASCADE);`,
    `CREATE TABLE IF NOT EXISTS itinerary_packing_checks (item_id TEXT NOT NULL, member_id TEXT NOT NULL, itinerary_id TEXT NOT NULL, checked_at TEXT NOT NULL, PRIMARY KEY (item_id, member_id), FOREIGN KEY (item_id, itinerary_id) REFERENCES itinerary_packing_items(id, itinerary_id) ON DELETE CASCADE, FOREIGN KEY (member_id, itinerary_id) REFERENCES itinerary_members(id, itinerary_id) ON DELETE CASCADE);`,
  ];
  for (const sql of migrations) await env.DB.prepare(sql).run();
  await env.DB.prepare('DELETE FROM itinerary_money_fund_transactions').run();
  await env.DB.prepare('DELETE FROM itinerary_money_item_splits').run();
  await env.DB.prepare('DELETE FROM itinerary_money_items').run();
  await env.DB.prepare('DELETE FROM itinerary_packing_checks').run();
  await env.DB.prepare('DELETE FROM itinerary_packing_items').run();
  await env.DB.prepare('DELETE FROM itinerary_packing_groups').run();
  await env.DB.prepare('DELETE FROM itinerary_members').run();
  await env.DB.prepare('DELETE FROM itinerary_money_settings').run();
  await env.DB.prepare('DELETE FROM itinerary_secrets').run();
  await env.DB.prepare('DELETE FROM itinerary_fork_stats').run();
  await env.DB.prepare('DELETE FROM steps').run();
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
      body: JSON.stringify({ title: 'ホテル', amount: 12000, status: 'paid', paid_by_member_id: alice.id, splits: [{ member_id: alice.id, amount: 8000 }, { member_id: bob.id, amount: 4000 }] }),
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
    expect(data.items.find((item: { id: string }) => item.id === paidExpense.id)).toMatchObject({
      title: 'ホテル', amount: 12000, status: 'paid', is_settled: false,
      split_member_ids: [alice.id, bob.id],
      splits: [{ member_id: alice.id, amount: 8000 }, { member_id: bob.id, amount: 4000 }],
    });
    expect(data.items.find((item: { id: string }) => item.id === individualPaid.id)).toMatchObject({ title: '拝観料', status: 'paid', paid_by_member_id: null, is_settled: false });
    expect(data.items.find((item: { id: string }) => item.id === individualPlanned.id)).toMatchObject({ status: 'planned', paid_by_member_id: null, is_settled: false });

    const settleResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/items/${paidExpense.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_settled: true }),
    }), env);
    expect(settleResponse.status).toBe(200);
    expect((await settleResponse.json() as any).data).toMatchObject({ is_settled: true, paid_by_member_id: alice.id });
  });

  it('rejects individual shares that do not match the expense total', async () => {
    const create = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '個別負担テスト' }),
    }), env);
    const { data: itinerary } = await create.json() as any;
    const memberResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Alice' }),
    }), env);
    const { data: member } = await memberResponse.json() as any;
    const response = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'ホテル', amount: 12000, status: 'paid', splits: [{ member_id: member.id, amount: 10000 }] }),
    }), env);
    expect(response.status).toBe(400);
  });

  it('tracks member contributions and expenses paid from a shared fund', async () => {
    const create = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '共同基金テスト' }),
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
    const transactions = [];
    for (const member of [alice, bob]) {
      const contribution = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/fund-transactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: member.id, kind: 'contribution', amount: 10000, note: '旅行前に集金' }),
      }), env);
      expect(contribution.status).toBe(201);
      transactions.push((await contribution.json() as any).data);
    }
    const updateTransaction = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/fund-transactions/${transactions[0].id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: bob.id, kind: 'refund', amount: 2000, note: '余りを返金', occurred_on: '2026-08-15' }),
    }), env);
    expect(updateTransaction.status).toBe(200);
    expect((await updateTransaction.json() as any).data).toMatchObject({ member_id: bob.id, kind: 'refund', amount: 2000, note: '余りを返金', occurred_on: '2026-08-15' });
    const expense = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'レンタカー', amount: 15000, status: 'paid', paid_from_fund: true, splits: [{ member_id: alice.id, amount: 7500 }, { member_id: bob.id, amount: 7500 }] }),
    }), env);
    expect(expense.status).toBe(201);
    expect((await expense.json() as any).data).toMatchObject({ paid_from_fund: true, paid_by_member_id: null });

    const invalidExpense = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '二重支払元', amount: 1000, status: 'paid', paid_from_fund: true, paid_by_member_id: alice.id, split_member_ids: [alice.id] }),
    }), env);
    expect(invalidExpense.status).toBe(400);

    const moneyResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money`), env);
    const money = (await moneyResponse.json() as any).data;
    expect(money.fund_transactions).toHaveLength(2);
    expect(money.fund_transactions.reduce((sum: number, transaction: { kind: string; amount: number }) => sum + (transaction.kind === 'contribution' ? transaction.amount : -transaction.amount), 0)).toBe(8000);
    expect(money.items[0]).toMatchObject({ title: 'レンタカー', paid_from_fund: true });

    const deleteMember = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/members/${alice.id}`, { method: 'DELETE' }), env);
    expect(deleteMember.status).toBe(409);
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

  it('prevents deleting a member referenced by an expense split', async () => {
    const create = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '参照テスト' }),
    }), env);
    const { data: itinerary } = await create.json() as any;
    const memberResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Alice' }),
    }), env);
    const { data: member } = await memberResponse.json() as any;
    await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'ホテル', amount: 1000, status: 'paid', split_member_ids: [member.id] }),
    }), env);

    const response = await app.fetch(new Request(
      `http://localhost/api/v1/itineraries/${itinerary.id}/members/${member.id}`,
      { method: 'DELETE' },
    ), env);
    expect(response.status).toBe(409);
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

    const privateResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '個人用の薬', kind: 'private', owner_member_id: alice.id, group_id: valuables.id }),
    }), env);
    const privateBody = await privateResponse.json() as any;
    const privateItem = privateBody.data;
    expect(privateResponse.status).toBe(201);
    expect(privateItem).toMatchObject({ kind: 'private', owner_member_id: alice.id });
    const privateCheckByBob = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/items/${privateItem.id}/check`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_id: bob.id, checked: true }),
    }), env);
    expect(privateCheckByBob.status).toBe(403);

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
    const beforeReorder = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing`), env);
    const beforeReorderData = (await beforeReorder.json() as any).data;
    const reorderedIds = [group.id, ...beforeReorderData.groups.filter((current: { id: string }) => current.id !== group.id).map((current: { id: string }) => current.id)];
    const reorder = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/groups/order`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_ids: reorderedIds }),
    }), env);
    expect(reorder.status).toBe(200);
    const afterReorder = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing`), env);
    expect((await afterReorder.json() as any).data.groups.map((current: { id: string }) => current.id)).toEqual(reorderedIds);
    const invalidReorder = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/groups/order`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_ids: reorderedIds.slice(1) }),
    }), env);
    expect(invalidReorder.status).toBe(400);
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

  it('cascades private items and clears shared assignments when a member is deleted', async () => {
    const create = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '削除テスト' }),
    }), env);
    const { data: itinerary } = await create.json() as any;
    const memberResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Alice' }),
    }), env);
    const { data: member } = await memberResponse.json() as any;
    const packingResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing`), env);
    const packing = (await packingResponse.json() as any).data;
    const groupId = packing.groups[0].id;

    const privateResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '薬', kind: 'private', owner_member_id: member.id, group_id: groupId }),
    }), env);
    const privateItem = (await privateResponse.json() as any).data;
    const sharedResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'カメラ', kind: 'shared', assignee_member_id: member.id, group_id: groupId }),
    }), env);
    const sharedItem = (await sharedResponse.json() as any).data;

    const deleteResponse = await app.fetch(new Request(
      `http://localhost/api/v1/itineraries/${itinerary.id}/members/${member.id}`,
      { method: 'DELETE' },
    ), env);
    expect(deleteResponse.status).toBe(200);

    const result = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing`), env);
    const data = (await result.json() as any).data;
    expect(data.items.some((item: { id: string }) => item.id === privateItem.id)).toBe(false);
    expect(data.items.find((item: { id: string }) => item.id === sharedItem.id).assignee_member_id).toBeNull();
  });

  it('deletes all native money and packing rows with their itinerary', async () => {
    const create = await app.fetch(new Request('http://localhost/api/v1/itineraries', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'しおり削除テスト' }),
    }), env);
    const { data: itinerary } = await create.json() as any;
    const memberResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/members`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Alice' }),
    }), env);
    const { data: member } = await memberResponse.json() as any;
    const packingResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing`), env);
    const packing = (await packingResponse.json() as any).data;
    await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/settings`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ budget_amount: 10000 }),
    }), env);
    await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/money/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '宿', amount: 1000, status: 'paid', paid_by_member_id: member.id, split_member_ids: [member.id] }),
    }), env);
    await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}/packing/items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '薬', kind: 'private', owner_member_id: member.id, group_id: packing.groups[0].id }),
    }), env);

    const deleteResponse = await app.fetch(new Request(`http://localhost/api/v1/itineraries/${itinerary.id}`, { method: 'DELETE' }), env);
    expect(deleteResponse.status).toBe(200);
    for (const table of [
      'itinerary_money_settings', 'itinerary_money_items', 'itinerary_money_item_splits',
      'itinerary_packing_groups', 'itinerary_packing_items', 'itinerary_packing_checks', 'itinerary_members',
    ]) {
      const row = await env.DB.prepare(`SELECT COUNT(*) AS count FROM ${table} WHERE itinerary_id = ?`).bind(itinerary.id).first<{ count: number }>();
      expect(Number(row?.count ?? 0), table).toBe(0);
    }
  });
});
