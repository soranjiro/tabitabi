import { Hono } from 'hono';
import { Env } from '../utils';
import { StepService } from '../services/step.service';
import { ItineraryService } from '../services/itinerary.service';
import { authMiddleware } from '../middleware/auth';

const steps = new Hono<{ Bindings: Env }>();

steps.get('/', async (c) => {
  const itineraryId = c.req.query('itinerary_id');

  if (!itineraryId) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'itinerary_id is required' }
    }, 400);
  }

  // Check if user is authenticated (edit mode)
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let isEditMode = false;
  if (token) {
    const { verifyToken } = await import('../utils/jwt');
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    isEditMode = !!payload;
  }

  const stepService = new StepService(c.env.DB);

  // If not in edit mode, check if secret mode is enabled for this itinerary
  if (!isEditMode) {
    const itineraryService = new ItineraryService(c.env.DB);
    const itinerary = await itineraryService.get(itineraryId);

    if (itinerary?.secret_settings?.enabled) {
      // Get current time in JST (UTC+9) because DB stores local time
      const now = new Date();
      const jstOffset = 9 * 60 * 60 * 1000;
      const jstTime = new Date(now.getTime() + jstOffset).toISOString().replace('Z', '');

      const offsetMinutes = itinerary.secret_settings.offset_minutes || 60;

      // Filter steps based on time
      const data = await stepService.list(itineraryId, {
        currentTime: jstTime,
        offsetMinutes: offsetMinutes
      });
      return c.json({ success: true, data });
    }
  }

  // Edit mode or secret mode disabled: return all steps
  const data = await stepService.list(itineraryId);
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

steps.post('/', authMiddleware, async (c) => {
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

  const shioriId = c.get('shioriId');
  if (input.itinerary_id !== shioriId) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only add steps to your own itinerary' }
    }, 403);
  }

  const service = new StepService(c.env.DB);
  const data = await service.create(input);
  return c.json({ success: true, data }, 201);
});

steps.put('/:stepId', authMiddleware, async (c) => {
  const stepId = c.req.param('stepId');
  const input = await c.req.json();
  const service = new StepService(c.env.DB);

  const existingStep = await service.get(stepId);
  if (!existingStep) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Step not found' }
    }, 404);
  }

  const shioriId = c.get('shioriId');
  if (existingStep.itinerary_id !== shioriId) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only edit steps in your own itinerary' }
    }, 403);
  }

  const data = await service.update(stepId, input);
  return c.json({ success: true, data });
});

steps.delete('/:stepId', authMiddleware, async (c) => {
  const stepId = c.req.param('stepId');
  const service = new StepService(c.env.DB);

  const existingStep = await service.get(stepId);
  if (!existingStep) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Step not found' }
    }, 404);
  }

  const shioriId = c.get('shioriId');
  if (existingStep.itinerary_id !== shioriId) {
    return c.json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'You can only delete steps in your own itinerary' }
    }, 403);
  }

  const success = await service.delete(stepId);
  return c.json({ success: true, data: null });
});

export default steps;
