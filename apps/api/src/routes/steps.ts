import { Hono } from 'hono';
import { Env } from '../utils';
import { StepService } from '../services/step.service';

const steps = new Hono<{ Bindings: Env }>();

// Get steps for an itinerary
steps.get('/:itineraryId/steps', async (c) => {
  const itineraryId = c.req.param('itineraryId');
  const service = new StepService(c.env.DB);
  const data = await service.list(itineraryId);
  return c.json({ success: true, data });
});

// Add step
steps.post('/:itineraryId/steps', async (c) => {
  const itineraryId = c.req.param('itineraryId');
  const input = await c.req.json();
  const service = new StepService(c.env.DB);
  const data = await service.create(itineraryId, input);
  return c.json({ success: true, data }, 201);
});

// Update step
steps.put('/steps/:stepId', async (c) => {
  const stepId = c.req.param('stepId');
  const input = await c.req.json();
  const service = new StepService(c.env.DB);
  const data = await service.update(stepId, input);

  if (!data) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Step not found' } }, 404);
  }

  return c.json({ success: true, data });
});

// Delete step
steps.delete('/steps/:stepId', async (c) => {
  const stepId = c.req.param('stepId');
  const service = new StepService(c.env.DB);
  const success = await service.delete(stepId);

  if (!success) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Step not found' } }, 404);
  }

  return c.json({ success: true, data: null });
});

export default steps;
