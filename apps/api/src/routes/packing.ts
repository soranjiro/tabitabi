import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { PackingData, PackingItem, TripMember } from '@tabitabi/types';
import { Env, Variables, generateId, getCurrentTimestamp } from '../utils';
import { ItineraryService } from '../services/itinerary.service';
import { optionalAuthMiddleware } from '../middleware/auth';
import { packingCheckSchema, packingItemSchema, updatePackingItemSchema } from '../validators';
import { validationHook } from '../validators/hook';

const packing = new Hono<{ Bindings: Env; Variables: Variables }>();

async function canEdit(c: Context<{ Bindings: Env; Variables: Variables }>, itineraryId: string): Promise<Response | null> {
  const itinerary = await new ItineraryService(c.env.DB, c.env).get(itineraryId);
  if (!itinerary) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  if (itinerary.source_itinerary_id) return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot edit a shared snapshot' } }, 403);
  if (itinerary.password && c.get('shioriId') !== itineraryId) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only edit your own itinerary' } }, 403);
  }
  return null;
}

async function memberBelongs(db: D1Database, itineraryId: string, memberId: string | null | undefined) {
  if (!memberId) return true;
  return !!await db.prepare('SELECT id FROM itinerary_members WHERE id = ? AND itinerary_id = ?').bind(memberId, itineraryId).first();
}

function itemFromRow(row: Record<string, unknown>, checks: string[]): PackingItem {
  return {
    id: String(row.id), itinerary_id: String(row.itinerary_id), name: String(row.name),
    kind: row.kind === 'shared' ? 'shared' : 'personal',
    assignee_member_id: row.assignee_member_id ? String(row.assignee_member_id) : null,
    is_packed: Number(row.is_packed) === 1, checked_member_ids: checks,
    created_at: String(row.created_at), updated_at: String(row.updated_at),
  };
}

packing.get('/itineraries/:id/packing', async (c) => {
  const itineraryId = c.req.param('id')!;
  if (!await new ItineraryService(c.env.DB, c.env).get(itineraryId)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }
  const [membersResult, itemsResult, checksResult] = await Promise.all([
    c.env.DB.prepare('SELECT id, itinerary_id, name, created_at FROM itinerary_members WHERE itinerary_id = ? ORDER BY created_at ASC').bind(itineraryId).all<TripMember>(),
    c.env.DB.prepare('SELECT * FROM itinerary_packing_items WHERE itinerary_id = ? ORDER BY kind ASC, created_at ASC').bind(itineraryId).all(),
    c.env.DB.prepare('SELECT c.item_id, c.member_id FROM itinerary_packing_checks c JOIN itinerary_packing_items i ON i.id = c.item_id WHERE i.itinerary_id = ?').bind(itineraryId).all<{ item_id: string; member_id: string }>(),
  ]);
  const checks = new Map<string, string[]>();
  for (const row of checksResult.results ?? []) checks.set(row.item_id, [...(checks.get(row.item_id) ?? []), row.member_id]);
  const data: PackingData = {
    members: membersResult.results ?? [],
    items: (itemsResult.results ?? []).map((row) => itemFromRow(row as Record<string, unknown>, checks.get(String((row as Record<string, unknown>).id)) ?? [])),
  };
  return c.json({ success: true, data });
});

packing.post('/itineraries/:id/packing/items', optionalAuthMiddleware, zValidator('json', packingItemSchema, validationHook), async (c) => {
  const itineraryId = c.req.param('id')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  const input = c.req.valid('json');
  const assignee = input.kind === 'shared' ? input.assignee_member_id ?? null : null;
  if (!await memberBelongs(c.env.DB, itineraryId, assignee)) return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Assignee must belong to this itinerary' } }, 400);
  const now = getCurrentTimestamp();
  const item: PackingItem = { id: generateId(), itinerary_id: itineraryId, name: input.name, kind: input.kind, assignee_member_id: assignee, is_packed: false, checked_member_ids: [], created_at: now, updated_at: now };
  await c.env.DB.prepare('INSERT INTO itinerary_packing_items (id, itinerary_id, name, kind, assignee_member_id, is_packed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)')
    .bind(item.id, itineraryId, item.name, item.kind, item.assignee_member_id, now, now).run();
  return c.json({ success: true, data: item }, 201);
});

packing.put('/itineraries/:id/packing/items/:itemId', optionalAuthMiddleware, zValidator('json', updatePackingItemSchema, validationHook), async (c) => {
  const itineraryId = c.req.param('id')!;
  const itemId = c.req.param('itemId')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  const current = await c.env.DB.prepare('SELECT * FROM itinerary_packing_items WHERE id = ? AND itinerary_id = ?').bind(itemId, itineraryId).first<Record<string, unknown>>();
  if (!current) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Packing item not found' } }, 404);
  const input = c.req.valid('json');
  const kind = input.kind ?? (current.kind === 'shared' ? 'shared' : 'personal');
  const assignee = kind === 'shared' ? (input.assignee_member_id === undefined ? (current.assignee_member_id ? String(current.assignee_member_id) : null) : input.assignee_member_id) : null;
  if (!await memberBelongs(c.env.DB, itineraryId, assignee)) return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Assignee must belong to this itinerary' } }, 400);
  const now = getCurrentTimestamp();
  await c.env.DB.prepare('UPDATE itinerary_packing_items SET name = ?, kind = ?, assignee_member_id = ?, updated_at = ? WHERE id = ? AND itinerary_id = ?')
    .bind(input.name ?? String(current.name), kind, assignee, now, itemId, itineraryId).run();
  if (kind === 'shared') await c.env.DB.prepare('DELETE FROM itinerary_packing_checks WHERE item_id = ?').bind(itemId).run();
  const checks = kind === 'personal'
    ? (await c.env.DB.prepare('SELECT member_id FROM itinerary_packing_checks WHERE item_id = ?').bind(itemId).all<{ member_id: string }>()).results?.map((row) => row.member_id) ?? []
    : [];
  return c.json({ success: true, data: itemFromRow({ ...current, name: input.name ?? current.name, kind, assignee_member_id: assignee, updated_at: now }, checks) });
});

packing.put('/itineraries/:id/packing/items/:itemId/check', optionalAuthMiddleware, zValidator('json', packingCheckSchema, validationHook), async (c) => {
  const itineraryId = c.req.param('id')!;
  const itemId = c.req.param('itemId')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  const item = await c.env.DB.prepare('SELECT kind FROM itinerary_packing_items WHERE id = ? AND itinerary_id = ?').bind(itemId, itineraryId).first<{ kind: string }>();
  if (!item) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Packing item not found' } }, 404);
  const { member_id, checked } = c.req.valid('json');
  const now = getCurrentTimestamp();
  if (item.kind === 'shared') {
    await c.env.DB.prepare('UPDATE itinerary_packing_items SET is_packed = ?, updated_at = ? WHERE id = ?').bind(checked ? 1 : 0, now, itemId).run();
  } else {
    if (!member_id || !await memberBelongs(c.env.DB, itineraryId, member_id)) return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A valid member is required' } }, 400);
    if (checked) await c.env.DB.prepare('INSERT OR REPLACE INTO itinerary_packing_checks (item_id, member_id, checked_at) VALUES (?, ?, ?)').bind(itemId, member_id, now).run();
    else await c.env.DB.prepare('DELETE FROM itinerary_packing_checks WHERE item_id = ? AND member_id = ?').bind(itemId, member_id).run();
  }
  return c.json({ success: true, data: { checked } });
});

packing.delete('/itineraries/:id/packing/items/:itemId', optionalAuthMiddleware, async (c) => {
  const itineraryId = c.req.param('id')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  await c.env.DB.batch([
    c.env.DB.prepare('DELETE FROM itinerary_packing_checks WHERE item_id = ?').bind(c.req.param('itemId')),
    c.env.DB.prepare('DELETE FROM itinerary_packing_items WHERE id = ? AND itinerary_id = ?').bind(c.req.param('itemId'), itineraryId),
  ]);
  return c.json({ success: true, data: null });
});

export default packing;
