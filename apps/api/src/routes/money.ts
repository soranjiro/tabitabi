import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { MoneyData, MoneyItem, MoneyMember } from '@tabitabi/types';
import { Env, Variables, generateId, getCurrentTimestamp } from '../utils';
import { ItineraryService } from '../services/itinerary.service';
import { optionalAuthMiddleware } from '../middleware/auth';
import { moneyItemSchema, moneyMemberSchema, moneySettingsSchema, updateMoneyItemSchema } from '../validators';
import { validationHook } from '../validators/hook';

const money = new Hono<{ Bindings: Env; Variables: Variables }>();

function itemFromRow(row: Record<string, unknown>, splitMemberIds: string[]): MoneyItem {
  return {
    id: String(row.id), itinerary_id: String(row.itinerary_id), title: String(row.title),
    amount: Number(row.amount), paid_by_member_id: row.paid_by_member_id ? String(row.paid_by_member_id) : null,
    status: row.status === 'planned' ? 'planned' : 'paid',
    is_settled: Number(row.is_settled ?? 0) === 1,
    occurred_on: row.occurred_on ? String(row.occurred_on) : null,
    step_id: row.step_id ? String(row.step_id) : null,
    split_member_ids: splitMemberIds, created_at: String(row.created_at), updated_at: String(row.updated_at),
  };
}

function groupSplitMemberIds(rows: { item_id: string; member_id: string }[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const row of rows) {
    result.set(row.item_id, [...(result.get(row.item_id) ?? []), row.member_id]);
  }
  return result;
}

function splitStatements(db: D1Database, itemId: string, itineraryId: string, memberIds: string[]) {
  return [...new Set(memberIds)].map((memberId) => db.prepare(
    'INSERT INTO itinerary_money_item_splits (item_id, member_id, itinerary_id) VALUES (?, ?, ?)',
  ).bind(itemId, memberId, itineraryId));
}

async function canEdit(c: Context<{ Bindings: Env; Variables: Variables }>, itineraryId: string): Promise<Response | null> {
  const service = new ItineraryService(c.env.DB, c.env);
  const itinerary = await service.get(itineraryId);
  if (!itinerary) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  if (itinerary.source_itinerary_id) return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot edit a shared snapshot' } }, 403);
  if (itinerary.password && c.get('shioriId') !== itineraryId) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only edit your own itinerary' } }, 403);
  }
  return null;
}

async function assertMembersBelongToItinerary(
  db: D1Database,
  itineraryId: string,
  memberIds: string[],
): Promise<boolean> {
  const ids = [...new Set(memberIds)];
  if (!ids.length) return false;
  const placeholders = ids.map(() => '?').join(', ');
  const result = await db.prepare(
    `SELECT COUNT(*) as count FROM itinerary_members WHERE itinerary_id = ? AND id IN (${placeholders})`,
  ).bind(itineraryId, ...ids).first<{ count: number }>();
  return Number(result?.count ?? 0) === ids.length;
}

async function assertStepBelongsToItinerary(db: D1Database, itineraryId: string, stepId: string | null | undefined): Promise<boolean> {
  if (!stepId) return true;
  return !!await db.prepare('SELECT id FROM steps WHERE id = ? AND itinerary_id = ?').bind(stepId, itineraryId).first();
}

money.get('/itineraries/:id/money', async (c) => {
  const itineraryId = c.req.param('id')!;
  const service = new ItineraryService(c.env.DB, c.env);
  if (!await service.get(itineraryId)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }
  const [settings, membersResult, itemsResult, splitsResult] = await Promise.all([
    c.env.DB.prepare('SELECT budget_amount FROM itinerary_money_settings WHERE itinerary_id = ?')
      .bind(itineraryId).first<{ budget_amount: number | null }>(),
    c.env.DB.prepare('SELECT id, itinerary_id, name, created_at FROM itinerary_members WHERE itinerary_id = ? ORDER BY created_at ASC').bind(itineraryId).all<MoneyMember>(),
    c.env.DB.prepare('SELECT * FROM itinerary_money_items WHERE itinerary_id = ? ORDER BY status ASC, occurred_on ASC, created_at DESC').bind(itineraryId).all(),
    c.env.DB.prepare('SELECT item_id, member_id FROM itinerary_money_item_splits WHERE itinerary_id = ? ORDER BY rowid ASC')
      .bind(itineraryId).all<{ item_id: string; member_id: string }>(),
  ]);
  const splitMemberIds = groupSplitMemberIds(splitsResult.results ?? []);
  const data: MoneyData = {
    budget_amount: settings?.budget_amount ?? null,
    members: membersResult.results ?? [],
    items: (itemsResult.results ?? []).map((row) => itemFromRow(
      row as Record<string, unknown>,
      splitMemberIds.get(String((row as Record<string, unknown>).id)) ?? [],
    )),
  };
  return c.json({ success: true, data });
});

money.put('/itineraries/:id/money/settings', optionalAuthMiddleware, zValidator('json', moneySettingsSchema, validationHook), async (c) => {
  const itineraryId = c.req.param('id')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  const { budget_amount } = c.req.valid('json');
  const now = getCurrentTimestamp();
  await c.env.DB.prepare(`INSERT INTO itinerary_money_settings (itinerary_id, budget_amount, created_at, updated_at)
    VALUES (?, ?, ?, ?) ON CONFLICT(itinerary_id) DO UPDATE SET budget_amount = excluded.budget_amount, updated_at = excluded.updated_at`)
    .bind(itineraryId, budget_amount, now, now).run();
  return c.json({ success: true, data: { budget_amount } });
});

money.post('/itineraries/:id/money/members', optionalAuthMiddleware, zValidator('json', moneyMemberSchema, validationHook), async (c) => {
  const itineraryId = c.req.param('id')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  const now = getCurrentTimestamp();
  const member: MoneyMember = { id: generateId(), itinerary_id: itineraryId, name: c.req.valid('json').name, created_at: now };
  await c.env.DB.prepare('INSERT INTO itinerary_members (id, itinerary_id, name, created_at) VALUES (?, ?, ?, ?)')
    .bind(member.id, member.itinerary_id, member.name, member.created_at).run();
  return c.json({ success: true, data: member }, 201);
});

money.put('/itineraries/:id/money/members/:memberId', optionalAuthMiddleware, zValidator('json', moneyMemberSchema, validationHook), async (c) => {
  const itineraryId = c.req.param('id')!;
  const memberId = c.req.param('memberId')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  const current = await c.env.DB.prepare('SELECT id, itinerary_id, name, created_at FROM itinerary_members WHERE id = ? AND itinerary_id = ?')
    .bind(memberId, itineraryId).first<MoneyMember>();
  if (!current) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } }, 404);
  const name = c.req.valid('json').name;
  await c.env.DB.prepare('UPDATE itinerary_members SET name = ? WHERE id = ? AND itinerary_id = ?')
    .bind(name, memberId, itineraryId).run();
  return c.json({ success: true, data: { ...current, name } });
});

money.delete('/itineraries/:id/money/members/:memberId', optionalAuthMiddleware, async (c) => {
  const itineraryId = c.req.param('id')!;
  const memberId = c.req.param('memberId')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  const member = await c.env.DB.prepare('SELECT id FROM itinerary_members WHERE id = ? AND itinerary_id = ?').bind(memberId, itineraryId).first();
  if (!member) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } }, 404);
  const referenced = await c.env.DB.prepare(`
    SELECT item.id
    FROM itinerary_money_items item
    WHERE item.itinerary_id = ?
      AND (
        item.paid_by_member_id = ?
        OR EXISTS (
          SELECT 1 FROM itinerary_money_item_splits split
          WHERE split.item_id = item.id AND split.member_id = ?
        )
      )
    LIMIT 1
  `).bind(itineraryId, memberId, memberId).first();
  if (referenced) return c.json({ success: false, error: { code: 'CONFLICT', message: 'Update or delete this member’s expenses first' } }, 409);
  await c.env.DB.prepare('DELETE FROM itinerary_members WHERE id = ? AND itinerary_id = ?')
    .bind(memberId, itineraryId).run();
  return c.json({ success: true, data: null });
});

money.post('/itineraries/:id/money/items', optionalAuthMiddleware, zValidator('json', moneyItemSchema, validationHook), async (c) => {
  const itineraryId = c.req.param('id')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  const input = c.req.valid('json');
  const idsToCheck = [...input.split_member_ids, ...(input.paid_by_member_id ? [input.paid_by_member_id] : [])];
  if (!await assertMembersBelongToItinerary(c.env.DB, itineraryId, idsToCheck)) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Members must belong to this itinerary' } }, 400);
  }
  if (!await assertStepBelongsToItinerary(c.env.DB, itineraryId, input.step_id)) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Step must belong to this itinerary' } }, 400);
  }
  if (input.is_settled && input.status !== 'paid') {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Only paid expenses can be settled' } }, 400);
  }
  const now = getCurrentTimestamp();
  const item: MoneyItem = { id: generateId(), itinerary_id: itineraryId, title: input.title, amount: input.amount, paid_by_member_id: input.paid_by_member_id ?? null, status: input.status, is_settled: input.is_settled ?? false, occurred_on: input.occurred_on ?? null, step_id: input.step_id ?? null, split_member_ids: [...new Set(input.split_member_ids)], created_at: now, updated_at: now };
  await c.env.DB.batch([
    c.env.DB.prepare(`INSERT INTO itinerary_money_items (id, itinerary_id, title, amount, paid_by_member_id, status, is_settled, occurred_on, step_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(item.id, item.itinerary_id, item.title, item.amount, item.paid_by_member_id, item.status, item.is_settled ? 1 : 0, item.occurred_on, item.step_id, now, now),
    ...splitStatements(c.env.DB, item.id, itineraryId, item.split_member_ids),
  ]);
  return c.json({ success: true, data: item }, 201);
});

money.put('/itineraries/:id/money/items/:itemId', optionalAuthMiddleware, zValidator('json', updateMoneyItemSchema, validationHook), async (c) => {
  const itineraryId = c.req.param('id')!;
  const itemId = c.req.param('itemId')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  const existing = await c.env.DB.prepare('SELECT * FROM itinerary_money_items WHERE id = ? AND itinerary_id = ?').bind(itemId, itineraryId).first<Record<string, unknown>>();
  if (!existing) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Money item not found' } }, 404);
  const input = c.req.valid('json');
  const existingSplits = await c.env.DB.prepare(
    'SELECT member_id FROM itinerary_money_item_splits WHERE item_id = ? AND itinerary_id = ? ORDER BY rowid ASC',
  ).bind(itemId, itineraryId).all<{ member_id: string }>();
  const current = itemFromRow(existing, (existingSplits.results ?? []).map((row) => row.member_id));
  const next = { ...current, ...input, split_member_ids: input.split_member_ids ?? current.split_member_ids, paid_by_member_id: input.paid_by_member_id === undefined ? current.paid_by_member_id : input.paid_by_member_id };
  const idsToCheck = [...next.split_member_ids, ...(next.paid_by_member_id ? [next.paid_by_member_id] : [])];
  if (!await assertMembersBelongToItinerary(c.env.DB, itineraryId, idsToCheck)) return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Members must belong to this itinerary' } }, 400);
  if (!await assertStepBelongsToItinerary(c.env.DB, itineraryId, next.step_id)) return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Step must belong to this itinerary' } }, 400);
  if (next.is_settled && next.status !== 'paid') return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Only paid expenses can be settled' } }, 400);
  const now = getCurrentTimestamp();
  const updated = { ...next, updated_at: now, split_member_ids: [...new Set(next.split_member_ids)] };
  await c.env.DB.batch([
    c.env.DB.prepare(`UPDATE itinerary_money_items SET title = ?, amount = ?, paid_by_member_id = ?, status = ?, is_settled = ?, occurred_on = ?, step_id = ?, updated_at = ? WHERE id = ? AND itinerary_id = ?`)
      .bind(updated.title, updated.amount, updated.paid_by_member_id, updated.status, updated.is_settled ? 1 : 0, updated.occurred_on, updated.step_id, now, itemId, itineraryId),
    c.env.DB.prepare('DELETE FROM itinerary_money_item_splits WHERE item_id = ? AND itinerary_id = ?').bind(itemId, itineraryId),
    ...splitStatements(c.env.DB, itemId, itineraryId, updated.split_member_ids),
  ]);
  return c.json({ success: true, data: updated });
});

money.delete('/itineraries/:id/money/items/:itemId', optionalAuthMiddleware, async (c) => {
  const itineraryId = c.req.param('id')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  await c.env.DB.prepare('DELETE FROM itinerary_money_items WHERE id = ? AND itinerary_id = ?').bind(c.req.param('itemId'), itineraryId).run();
  return c.json({ success: true, data: null });
});

export default money;
