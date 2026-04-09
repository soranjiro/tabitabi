import { Hono } from 'hono';
import { Env, Variables } from '../utils';
import { ItineraryService } from '../services/itinerary.service';
import { authMiddleware, optionalAuthMiddleware, optionalUserAuthMiddleware, userAuthMiddleware } from '../middleware/auth';
import { generateToken } from '../utils/jwt';
import { UserService } from '../services/user.service';

const itineraries = new Hono<{ Bindings: Env; Variables: Variables }>();

itineraries.get('/', async (c) => {
  const service = new ItineraryService(c.env.DB);
  const data = await service.list();
  const response = data.map(itinerary => service.toResponseItinerary(itinerary));
  return c.json({ success: true, data: response });
});

itineraries.get('/:id', async (c) => {
  const id = c.req.param('id');
  const service = new ItineraryService(c.env.DB);
  const data = await service.get(id);

  if (!data) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  return c.json({ success: true, data: service.toResponseItinerary(data) });
});

itineraries.post('/', optionalUserAuthMiddleware, async (c) => {
  const input = await c.req.json();
  const service = new ItineraryService(c.env.DB);
  const data = await service.create(input);

  const token = await generateToken(data.id, c.env.JWT_SECRET);
  const response = service.toResponseItinerary(data);

  const userId = c.get('userId');
  if (userId) {
    try {
      const userService = new UserService(c.env.DB);
      await userService.addBookmark(userId, data.id);
    } catch {
      // 非致命的: しおりは作成済み、/me/sync-bookmarks で後から同期可能
    }
  }

  return c.json({ success: true, data: { ...response, token } }, 201);
});

itineraries.put('/:id', optionalAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const input = await c.req.json();
  const service = new ItineraryService(c.env.DB);
  const existing = await service.get(id);

  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  if (existing.source_itinerary_id) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot edit a shared snapshot' } }, 403);
  }

  if (existing.password) {
    const shioriId = c.get('shioriId');

    if (id !== shioriId) {
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only edit your own itinerary' }
      }, 403);
    }
  }

  const data = await service.update(id, input);

  if (!data) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  return c.json({ success: true, data: service.toResponseItinerary(data) });
});

itineraries.post('/:id/publish', optionalAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const service = new ItineraryService(c.env.DB);
  const existing = await service.get(id);

  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  if (existing.source_itinerary_id) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot publish a shared snapshot' } }, 403);
  }

  // For password-protected itineraries, verify the itinerary token.
  // Note: public (no-password) itineraries have no server-side ownership concept;
  // anyone who knows the ID can publish. This is consistent with the current edit model.
  if (existing.password) {
    const shioriId = c.get('shioriId');
    if (id !== shioriId) {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only publish your own itinerary' } }, 403);
    }
  }

  const snapshot = await service.publish(id);

  return c.json({ success: true, data: { id: snapshot.id } });
});

itineraries.post('/:id/fork', userAuthMiddleware, async (c) => {
  const sourceId = c.req.param('id');
  const userId = c.get('userId');
  const service = new ItineraryService(c.env.DB);

  let result: Awaited<ReturnType<typeof service.fork>>;
  try {
    result = await service.fork(sourceId);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '';
    if (msg === 'NOT_FOUND') {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
    }
    if (msg === 'FORBIDDEN') {
      return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot fork a password-protected itinerary' } }, 403);
    }
    throw e;
  }

  const token = await generateToken(result.itinerary.id, c.env.JWT_SECRET);

  if (userId) {
    try {
      const userService = new UserService(c.env.DB);
      await userService.addBookmark(userId, result.itinerary.id);
    } catch {
      // 非致命的
    }
  }

  return c.json({
    success: true,
    data: {
      id: result.itinerary.id,
      title: result.itinerary.title,
      theme_id: result.itinerary.theme_id,
      token,
    }
  }, 201);
});

itineraries.delete('/:id', optionalAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const service = new ItineraryService(c.env.DB);
  const existing = await service.get(id);

  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  if (existing.source_itinerary_id) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete a shared snapshot' } }, 403);
  }

  if (existing.password) {
    const shioriId = c.get('shioriId');

    if (id !== shioriId) {
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only delete your own itinerary' }
      }, 403);
    }
  }

  const success = await service.delete(id);

  if (!success) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  return c.json({ success: true, data: null });
});

export default itineraries;
