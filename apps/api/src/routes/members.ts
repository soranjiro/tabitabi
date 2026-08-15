import { Hono, type Context } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { TripMember } from '@tabitabi/types';
import { Env, Variables, generateId, getCurrentTimestamp } from '../utils';
import { ItineraryService } from '../services/itinerary.service';
import { optionalAuthMiddleware } from '../middleware/auth';
import { tripMemberSchema } from '../validators';
import { validationHook } from '../validators/hook';

const members = new Hono<{ Bindings: Env; Variables: Variables }>();

async function canEdit(c: Context<{ Bindings: Env; Variables: Variables }>, itineraryId: string): Promise<Response | null> {
  const itinerary = await new ItineraryService(c.env.DB, c.env).get(itineraryId);
  if (!itinerary) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  if (itinerary.source_itinerary_id) return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot edit a shared snapshot' } }, 403);
  if (itinerary.password && c.get('shioriId') !== itineraryId) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only edit your own itinerary' } }, 403);
  }
  return null;
}

members.get('/itineraries/:id/members', async (c) => {
  const itineraryId = c.req.param('id')!;
  if (!await new ItineraryService(c.env.DB, c.env).get(itineraryId)) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }
  const result = await c.env.DB.prepare(
    'SELECT id, itinerary_id, name, created_at FROM itinerary_members WHERE itinerary_id = ? ORDER BY created_at ASC',
  ).bind(itineraryId).all<TripMember>();
  return c.json({ success: true, data: result.results ?? [] });
});

members.post('/itineraries/:id/members', optionalAuthMiddleware, zValidator('json', tripMemberSchema, validationHook), async (c) => {
  const itineraryId = c.req.param('id')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  const member: TripMember = {
    id: generateId(), itinerary_id: itineraryId, name: c.req.valid('json').name, created_at: getCurrentTimestamp(),
  };
  await c.env.DB.prepare('INSERT INTO itinerary_members (id, itinerary_id, name, created_at) VALUES (?, ?, ?, ?)')
    .bind(member.id, member.itinerary_id, member.name, member.created_at).run();
  return c.json({ success: true, data: member }, 201);
});

members.put('/itineraries/:id/members/:memberId', optionalAuthMiddleware, zValidator('json', tripMemberSchema, validationHook), async (c) => {
  const itineraryId = c.req.param('id')!;
  const memberId = c.req.param('memberId')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  const current = await c.env.DB.prepare('SELECT id, itinerary_id, name, created_at FROM itinerary_members WHERE id = ? AND itinerary_id = ?')
    .bind(memberId, itineraryId).first<TripMember>();
  if (!current) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } }, 404);
  const name = c.req.valid('json').name;
  await c.env.DB.prepare('UPDATE itinerary_members SET name = ? WHERE id = ? AND itinerary_id = ?')
    .bind(name, memberId, itineraryId).run();
  return c.json({ success: true, data: { ...current, name } });
});

members.delete('/itineraries/:id/members/:memberId', optionalAuthMiddleware, async (c) => {
  const itineraryId = c.req.param('id')!;
  const memberId = c.req.param('memberId')!;
  const denied = await canEdit(c, itineraryId);
  if (denied) return denied;
  const member = await c.env.DB.prepare('SELECT id FROM itinerary_members WHERE id = ? AND itinerary_id = ?').bind(memberId, itineraryId).first();
  if (!member) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } }, 404);
  const moneyReference = await c.env.DB.prepare(`
    SELECT item.id FROM itinerary_money_items item
    WHERE item.itinerary_id = ? AND (item.paid_by_member_id = ? OR EXISTS (
      SELECT 1 FROM itinerary_money_item_splits split WHERE split.item_id = item.id AND split.member_id = ?
    ))
    UNION ALL
    SELECT fund_entry.id FROM itinerary_money_fund_transactions fund_entry
    WHERE fund_entry.itinerary_id = ? AND fund_entry.member_id = ?
    LIMIT 1
  `).bind(itineraryId, memberId, memberId, itineraryId, memberId).first();
  if (moneyReference) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: 'Update or delete this member’s money records first' } }, 409);
  }
  await c.env.DB.prepare('DELETE FROM itinerary_members WHERE id = ? AND itinerary_id = ?')
    .bind(memberId, itineraryId).run();
  return c.json({ success: true, data: null });
});

export default members;
