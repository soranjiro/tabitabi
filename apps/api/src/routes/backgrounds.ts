import { Hono } from 'hono';
import { optionalAuthMiddleware } from '../middleware/auth';
import { Env, Variables, getCurrentTimestamp } from '../utils';

const backgrounds = new Hono<{ Bindings: Env; Variables: Variables }>();

const PRESET_PATTERN = /^\/itinerary-backgrounds\/[a-z0-9-]+\.avif$/;

backgrounds.get('/:itineraryId', async (c) => {
  const itineraryId = c.req.param('itineraryId');
  const itinerary = await c.env.DB.prepare(
    'SELECT background_image FROM itineraries WHERE id = ?',
  ).bind(itineraryId).first<{ background_image: string | null }>();

  if (!itinerary) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  return c.json({ success: true, data: { background_image: itinerary.background_image ?? null } });
});

backgrounds.put('/:itineraryId', optionalAuthMiddleware, async (c) => {
  const itineraryId = c.req.param('itineraryId');
  const existing = await c.env.DB.prepare(
    'SELECT password, source_itinerary_id FROM itineraries WHERE id = ?',
  ).bind(itineraryId).first<{ password: string | null; source_itinerary_id: string | null }>();

  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }
  if (existing.source_itinerary_id) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot edit a shared snapshot' } }, 403);
  }
  if (existing.password && c.get('shioriId') !== itineraryId) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only edit your own itinerary' } }, 403);
  }

  let body: { background_image?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, 400);
  }

  const value = body.background_image;
  if (value !== null && (typeof value !== 'string' || !PRESET_PATTERN.test(value))) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unknown background preset' } }, 400);
  }

  await c.env.DB.prepare(
    'UPDATE itineraries SET background_image = ?, updated_at = ? WHERE id = ?',
  ).bind(value, getCurrentTimestamp(), itineraryId).run();

  return c.json({ success: true, data: { background_image: value } });
});

export default backgrounds;
