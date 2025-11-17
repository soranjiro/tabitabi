import { Hono } from 'hono';
import { Env } from '../utils';
import { ItineraryService } from '../services/itinerary.service';

const itineraries = new Hono<{ Bindings: Env }>();

itineraries.get('/', async (c) => {
  const service = new ItineraryService(c.env.DB);
  const data = await service.list();
  return c.json({ success: true, data });
});

itineraries.get('/:id', async (c) => {
  const id = c.req.param('id');
  const service = new ItineraryService(c.env.DB);
  const data = await service.get(id);

  if (!data) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  return c.json({ success: true, data });
});

itineraries.post('/', async (c) => {
  const input = await c.req.json();
  const service = new ItineraryService(c.env.DB);
  const data = await service.create(input);
  return c.json({ success: true, data }, 201);
});

itineraries.put('/:id', async (c) => {
  const id = c.req.param('id');
  const input = await c.req.json();
  const service = new ItineraryService(c.env.DB);
  const data = await service.update(id, input);

  if (!data) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  return c.json({ success: true, data });
});

itineraries.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const service = new ItineraryService(c.env.DB);
  const success = await service.delete(id);

  if (!success) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  return c.json({ success: true, data: null });
});

export default itineraries;
