import { Hono } from 'hono';
import { Env } from '../utils';
import { StepService } from '../services/step.service';

const steps = new Hono<{ Bindings: Env }>();

steps.get('/', async (c) => {
  const itineraryId = c.req.query('itinerary_id');

  if (!itineraryId) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'itinerary_id is required' }
    }, 400);
  }

  const service = new StepService(c.env.DB);
  const data = await service.list(itineraryId);
  return c.json({ success: true, data });
});

steps.get('/:stepId', async (c) => {
  const stepId = c.req.param('stepId');
  const service = new StepService(c.env.DB);
  const data = await service.get(stepId);

  if (!data) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Step not found' }
    }, 404);
  }

  return c.json({ success: true, data });
});

steps.post('/', async (c) => {
  const input = await c.req.json();

  if (!input.itinerary_id || !input.title || !input.date || !input.time) {
    return c.json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'itinerary_id, title, date, and time are required'
      }
    }, 400);
  }

  const service = new StepService(c.env.DB);
  const data = await service.create(input);
  return c.json({ success: true, data }, 201);
});

steps.put('/:stepId', async (c) => {
  const stepId = c.req.param('stepId');
  const input = await c.req.json();
  const service = new StepService(c.env.DB);
  const data = await service.update(stepId, input);

  if (!data) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Step not found' }
    }, 404);
  }

  return c.json({ success: true, data });
});

steps.delete('/:stepId', async (c) => {
  const stepId = c.req.param('stepId');
  const service = new StepService(c.env.DB);
  const success = await service.delete(stepId);

  if (!success) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Step not found' }
    }, 404);
  }

  return c.json({ success: true, data: null });
});

export default steps;
