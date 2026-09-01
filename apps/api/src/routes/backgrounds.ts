import { Hono } from 'hono';
import { optionalAuthMiddleware } from '../middleware/auth';
import { Env, Variables, getCurrentTimestamp } from '../utils';

const backgrounds = new Hono<{ Bindings: Env; Variables: Variables }>();

const ALLOWED_BACKGROUNDS = new Set([
  '/hero/background-spring.avif',
  '/hero/background-summer.avif',
  '/hero/background-autumn.avif',
  '/hero/background-winter.avif',
  '/itinerary-backgrounds/sakura.avif',
  '/itinerary-backgrounds/seaside.avif',
  '/itinerary-backgrounds/meadow.avif',
  '/itinerary-backgrounds/sunset.avif',
  '/itinerary-backgrounds/snow.avif',
  '/itinerary-backgrounds/twilight.avif',
  '/itinerary-backgrounds/island.avif',
  '/itinerary-backgrounds/mountain.avif',
  '/itinerary-backgrounds/lake.avif',
  '/itinerary-backgrounds/town.avif',
]);

backgrounds.get('/:itineraryId', async (c) => {
  const itineraryId = c.req.param('itineraryId');
  const itinerary = await c.env.DB.prepare(
    'SELECT background_image, page_background_image FROM itineraries WHERE id = ?',
  ).bind(itineraryId).first<{ background_image: string | null; page_background_image: string | null }>();

  if (!itinerary) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  return c.json({ success: true, data: {
    cover_background_image: itinerary.background_image ?? null,
    page_background_image: itinerary.page_background_image ?? null,
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

  let body: { cover_background_image?: unknown; page_background_image?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } }, 400);
  }

  const isPreset = (value: unknown) => value === null || (typeof value === 'string' && ALLOWED_BACKGROUNDS.has(value));
  if (!Object.hasOwn(body, 'cover_background_image') && !Object.hasOwn(body, 'page_background_image')) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'A background setting is required' } }, 400);
  }
  if (!isPreset(body.cover_background_image) || !isPreset(body.page_background_image)) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Unknown background preset' } }, 400);
  }

  const current = await c.env.DB.prepare(
    'SELECT background_image, page_background_image FROM itineraries WHERE id = ?',
  ).bind(itineraryId).first<{ background_image: string | null; page_background_image: string | null }>();
  const coverBackgroundImage = Object.hasOwn(body, 'cover_background_image')
    ? body.cover_background_image as string | null
    : current?.background_image ?? null;
  const pageBackgroundImage = Object.hasOwn(body, 'page_background_image')
    ? body.page_background_image as string | null
    : current?.page_background_image ?? null;

  await c.env.DB.prepare(
    'UPDATE itineraries SET background_image = ?, page_background_image = ?, updated_at = ? WHERE id = ?',
  ).bind(coverBackgroundImage, pageBackgroundImage, getCurrentTimestamp(), itineraryId).run();

  return c.json({ success: true, data: { cover_background_image: coverBackgroundImage, page_background_image: pageBackgroundImage } });
});

export default backgrounds;
