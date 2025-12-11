import { Hono } from 'hono';
import { Env } from '../utils';
import { ItineraryService } from '../services/itinerary.service';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { generateToken } from '../utils/jwt';

const itineraries = new Hono<{ Bindings: Env }>();

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

itineraries.post('/', async (c) => {
  const input = await c.req.json();
  const service = new ItineraryService(c.env.DB);
  const data = await service.create(input);

  const token = await generateToken(data.id, c.env.JWT_SECRET);
  const response = service.toResponseItinerary(data);

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

itineraries.delete('/:id', optionalAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const service = new ItineraryService(c.env.DB);
  const existing = await service.get(id);

  if (!existing) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
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
