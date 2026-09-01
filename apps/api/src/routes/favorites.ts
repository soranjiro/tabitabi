import { Hono } from 'hono';
import { userAuthMiddleware, userProfileMiddleware } from '../middleware/auth';
import { UserService } from '../services/user.service';
import { Env, Variables, getCurrentTimestamp } from '../utils';

const favorites = new Hono<{ Bindings: Env; Variables: Variables }>();

favorites.use('*', userAuthMiddleware, userProfileMiddleware);

favorites.get('/', async (c) => {
  const rows = await c.env.DB.prepare(`
    SELECT f.itinerary_id
    FROM itinerary_favorites f
    JOIN itineraries i ON i.id = f.itinerary_id
    WHERE f.user_id = ?
      AND i.password IS NULL
      AND i.source_itinerary_id IS NOT NULL
    ORDER BY f.created_at DESC
  `).bind(c.get('userId')!).all<{ itinerary_id: string }>();

  return c.json({
    success: true,
    data: { itinerary_ids: (rows.results ?? []).map((row) => row.itinerary_id) },
  });
});

favorites.get('/itineraries', async (c) => {
  const items = await new UserService(c.env.DB).getFavoriteItineraries(c.get('userId')!);
  return c.json({ success: true, data: { items } });
});

favorites.put('/:itineraryId', async (c) => {
  const itineraryId = c.req.param('itineraryId');
  const publicItinerary = await c.env.DB.prepare(`
    SELECT 1 FROM itineraries
    WHERE id = ? AND password IS NULL AND source_itinerary_id IS NOT NULL
  `).bind(itineraryId).first();

  if (!publicItinerary) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Public itinerary not found' } }, 404);
  }

  await c.env.DB.prepare(`
    INSERT INTO itinerary_favorites (user_id, itinerary_id, created_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, itinerary_id) DO NOTHING
  `).bind(c.get('userId')!, itineraryId, getCurrentTimestamp()).run();

  return c.json({ success: true, data: { itinerary_id: itineraryId, favorited: true } });
});

favorites.delete('/:itineraryId', async (c) => {
  const itineraryId = c.req.param('itineraryId');
  await c.env.DB.prepare(
    'DELETE FROM itinerary_favorites WHERE user_id = ? AND itinerary_id = ?',
  ).bind(c.get('userId')!, itineraryId).run();

  return c.json({ success: true, data: { itinerary_id: itineraryId, favorited: false } });
});

export default favorites;
