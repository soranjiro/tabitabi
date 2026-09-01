import { Hono } from 'hono';
import { optionalAuthMiddleware } from '../middleware/auth';
import { Env, Variables, getCurrentTimestamp } from '../utils';

const backgrounds = new Hono<{ Bindings: Env; Variables: Variables }>();

const ALLOWED_BACKGROUNDS = new Set([
  '/hero/background-spring.avif',
  '/hero/background-summer.avif',
  '/hero/background-autumn.avif',
  '/hero/background-winter.avif',
  '/itinerary-backgrounds/festival.webp',
  '/itinerary-backgrounds/camp.avif',
  '/itinerary-backgrounds/starry-camp.avif',
  '/itinerary-backgrounds/japanese.avif',
  '/itinerary-backgrounds/starry-sky.avif',
  '/itinerary-backgrounds/coastal-drive.avif',
  '/itinerary-backgrounds/sea-turtle.avif',
  '/itinerary-backgrounds/hot-spring.avif',
  '/itinerary-backgrounds/sky.avif',
  '/itinerary-backgrounds/food.webp',
]);

backgrounds.get('/:itineraryId', async (c) => {
  const itineraryId = c.req.param('itineraryId');
  const itinerary = await c.env.DB.prepare(
    'SELECT background_image, background_display FROM itineraries WHERE id = ?',
  ).bind(itineraryId).first<{ background_image: string | null; background_display: 'cover' | 'page' }>();

  if (!itinerary) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  return c.json({ success: true, data: {
    background_image: itinerary.background_image ?? null,
    background_display: itinerary.background_display ?? 'cover',
  } });
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

  let body: { background_image?: unknown; background_display?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, 400);
  }

  const isPreset = (value: unknown) => value === null || (typeof value === 'string' && ALLOWED_BACKGROUNDS.has(value));
  if (!Object.hasOwn(body, 'background_image') || !Object.hasOwn(body, 'background_display')) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A background setting is required' } }, 400);
  }
  if (!isPreset(body.background_image) || !['cover', 'page'].includes(String(body.background_display))) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unknown background preset' } }, 400);
  }
  const backgroundImage = body.background_image as string | null;
  const backgroundDisplay = body.background_display as 'cover' | 'page';

  await c.env.DB.prepare(
    'UPDATE itineraries SET background_image = ?, background_display = ?, updated_at = ? WHERE id = ?',
  ).bind(backgroundImage, backgroundDisplay, getCurrentTimestamp(), itineraryId).run();

  return c.json({ success: true, data: { background_image: backgroundImage, background_display: backgroundDisplay } });
});

export default backgrounds;
