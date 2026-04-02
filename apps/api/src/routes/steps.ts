import { Hono } from 'hono';
import { Env } from '../utils';
import { StepService } from '../services/step.service';
import { ItineraryService } from '../services/itinerary.service';
import { extractBearerToken, verifyToken } from '../utils/jwt';

const steps = new Hono<{ Bindings: Env }>();

function parseToUnixMs(value: unknown): number | null {
  // Strict: only accept numeric Unix timestamps in milliseconds.
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

steps.get('/', async (c) => {
  const itineraryId = c.req.query('itinerary_id');

  if (!itineraryId) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'itinerary_id is required' }
    }, 400);
  }

  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let isEditMode = false;
  if (token) {
    const { verifyToken } = await import('../utils/jwt');
    const payload = await verifyToken(token, c.env.JWT_SECRET);
    isEditMode = !!payload;
  }

  const stepService = new StepService(c.env.DB);
  const itineraryService = new ItineraryService(c.env.DB);
  const itinerary = await itineraryService.get(itineraryId);

  if (itinerary?.secret_settings?.enabled) {
    const now = Date.now();
    const offsetMinutes = itinerary.secret_settings.offset_minutes || 60;
    const hasEditPermission = isEditMode || !itinerary.password;

    const data = await stepService.list(itineraryId, {
      currentTime: now,
      offsetMinutes,
      maskSecrets: !hasEditPermission
    });

    return c.json({ success: true, data });
  }

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

steps.post('/', async (c) => {
  const raw = await c.req.json();

  if (!raw.itinerary_id || !raw.title) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'itinerary_id and title are required' }
    }, 400);
  }

  const startAt = parseToUnixMs(raw.start_at);
  if (startAt === null) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'start_at is required and must be a numeric timestamp (milliseconds)' } }, 400);
  }

  const endAt = raw.end_at !== undefined ? parseToUnixMs(raw.end_at) : undefined;

  const itineraryService = new ItineraryService(c.env.DB);
  const itinerary = await itineraryService.get(raw.itinerary_id);
  if (!itinerary) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  if (itinerary.password) {
    const token = extractBearerToken(c.req.header('Authorization'));
    const payload = token ? await verifyToken(token, c.env.JWT_SECRET) : null;
    if (!payload || payload.shioriId !== raw.itinerary_id) {
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only add steps to your own password-protected itinerary' }
      }, 403);
    }
  }

  const service = new StepService(c.env.DB);
  const payload = { ...raw, start_at: startAt, end_at: endAt };
  const data = await service.create(payload);
  return c.json({ success: true, data }, 201);
});

steps.put('/:stepId', async (c) => {
  const stepId = c.req.param('stepId');
  const raw = await c.req.json();
  const service = new StepService(c.env.DB);

  // TODO: refactor
  if (raw.start_at !== undefined && raw.end_at !== undefined && raw.start_at > raw.end_at) {
    let tmp_timestamp = raw.start_at;
    raw.start_at = raw.end_at;
    raw.end_at = tmp_timestamp;
  }

  const existingStep = await service.get(stepId);
  if (!existingStep) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Step not found' } }, 404);
  }

  const itineraryService = new ItineraryService(c.env.DB);
  const itinerary = await itineraryService.get(existingStep.itinerary_id);
  if (!itinerary) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }
  if (itinerary.password) {
    const token = extractBearerToken(c.req.header('Authorization'));
    const payload = token ? await verifyToken(token, c.env.JWT_SECRET) : null;
    if (!payload || payload.shioriId !== existingStep.itinerary_id) {
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only edit steps in your own password-protected itinerary' }
      }, 403);
    }
  }

  const updatePayload: Record<string, unknown> = { ...raw };
  if (raw.start_at !== undefined) {
    const parsed = parseToUnixMs(raw.start_at);
    if (parsed === null) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'start_at provided is invalid (must be numeric milliseconds)' } }, 400);
    }
    updatePayload.start_at = parsed;
  }
  if (raw.end_at !== undefined) {
    const parsedEnd = parseToUnixMs(raw.end_at);
    if (parsedEnd === null) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'end_at provided is invalid (must be numeric milliseconds)' } }, 400);
    }
    updatePayload.end_at = parsedEnd;
  }

  const data = await service.update(stepId, updatePayload as any);
  return c.json({ success: true, data });
});

steps.delete('/:stepId', async (c) => {
  const stepId = c.req.param('stepId');
  const service = new StepService(c.env.DB);

  const existingStep = await service.get(stepId);
  if (!existingStep) {
    return c.json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Step not found' }
    }, 404);
  }

  const itineraryService = new ItineraryService(c.env.DB);
  const itinerary = await itineraryService.get(existingStep.itinerary_id);
  if (!itinerary) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }
  if (itinerary.password) {
    const token = extractBearerToken(c.req.header('Authorization'));
    const payload = token ? await verifyToken(token, c.env.JWT_SECRET) : null;
    if (!payload || payload.shioriId !== existingStep.itinerary_id) {
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You can only delete steps in your own password-protected itinerary' }
      }, 403);
    }
  }

  const success = await service.delete(stepId);
  return c.json({ success: true, data: null });
});

export default steps;
