import { Hono } from 'hono';
import { Env } from '../utils';
import { TimelineService } from '../services/timeline.service';

const timeline = new Hono<{ Bindings: Env }>();

// Get timeline for an itinerary
timeline.get('/:itineraryId/timeline', async (c) => {
  const itineraryId = c.req.param('itineraryId');
  const service = new TimelineService(c.env.DB);
  const data = await service.list(itineraryId);
  return c.json({ success: true, data });
});

// Add step to timeline
timeline.post('/:itineraryId/timeline/steps', async (c) => {
  const itineraryId = c.req.param('itineraryId');
  const input = await c.req.json();
  const service = new TimelineService(c.env.DB);
  const data = await service.create(itineraryId, input);
  return c.json({ success: true, data }, 201);
});

// Update timeline step
timeline.put('/timeline/steps/:stepId', async (c) => {
  const stepId = c.req.param('stepId');
  const input = await c.req.json();
  const service = new TimelineService(c.env.DB);
  const data = await service.update(stepId, input);

  if (!data) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Step not found' } }, 404);
  }

  return c.json({ success: true, data });
});

// Delete timeline step
timeline.delete('/timeline/steps/:stepId', async (c) => {
  const stepId = c.req.param('stepId');
  const service = new TimelineService(c.env.DB);
  const success = await service.delete(stepId);

  if (!success) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Step not found' } }, 404);
  }

  return c.json({ success: true, data: null });
});

// Reorder timeline step
timeline.post('/timeline/steps/:stepId/reorder', async (c) => {
  const stepId = c.req.param('stepId');
  const { newOrder } = await c.req.json();
  const service = new TimelineService(c.env.DB);
  const success = await service.reorder(stepId, newOrder);

  if (!success) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Step not found' } }, 404);
  }

  return c.json({ success: true, data: null });
});

export default timeline;
