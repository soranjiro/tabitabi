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

/**
 * Reject malformed and oversized step fields before they can reach D1.
 * Preserve all existing optional step fields and the public editor payload.
 */
function invalidStepInput(value: unknown, creating: boolean): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return true;
  const data = value as Record<string, unknown>;
  if (creating && (typeof data.itinerary_id !== 'string' || !data.itinerary_id || data.itinerary_id.length > 128)) return true;
  if (creating && (typeof data.title !== 'string' || !data.title.trim())) return true;

  for (const [name, max] of [
    ['title', 200], ['location', 1000], ['notes', 100000],
    ['link', 2048], ['type', 64],
  ] as const) {
    const field = data[name];
    if (field !== undefined && field !== null && (typeof field !== 'string' || field.length > max)) return true;
  }
  if (data.title === '') return true;
  for (const name of ['time_unspecified', 'is_all_day', 'is_priority'] as const) {
    if (data[name] !== undefined && typeof data[name] !== 'boolean') return true;
  }
  if (data.sort_order !== undefined && data.sort_order !== null
    && (typeof data.sort_order !== 'number' || !Number.isFinite(data.sort_order))) return true;
  return false;
}

steps.get('/', async (c) => {
  const itineraryId = c.req.query('itinerary_id');

  if (!itineraryId) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'itinerary_id is required' }
    }, 400);
  }

  const token = extractBearerToken(c.req.header('Authorization'));
  const payload = token ? await verifyToken(token, c.env.JWT_SECRET) : null;
  const isEditMode = payload?.shioriId === itineraryId;

  const stepService = new StepService(c.env.DB);
  const itineraryService = new ItineraryService(c.env.DB);
  const itinerary = await itineraryService.get(itineraryId);

  if (itinerary?.secret_settings?.enabled) {
    const now = Date.now();
    const offsetMinutes = itinerary.secret_settings.offset_minutes ?? 60;
    const hasEditPermission = isEditMode || !itinerary.password;

    const data = await stepService.list(itinerary.id, {
      currentTime: now,
      offsetMinutes,
      maskSecrets: !hasEditPermission
    });

    return c.json({ success: true, data });
  }

  const data = await stepService.list(itinerary?.id ?? itineraryId);
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

  const itinerary = await new ItineraryService(c.env.DB).get(data.itinerary_id);
  if (itinerary?.secret_settings?.enabled) {
    const token = extractBearerToken(c.req.header('Authorization'));
    const payload = token ? await verifyToken(token, c.env.JWT_SECRET) : null;
    const masked = await service.get(stepId, {
      currentTime: Date.now(),
      offsetMinutes: itinerary.secret_settings.offset_minutes ?? 60,
      maskSecrets: Boolean(itinerary.password) && payload?.shioriId !== itinerary.id,
    });
    return c.json({ success: true, data: masked });
  }

  return c.json({ success: true, data });
});

steps.post('/', async (c) => {
  let raw: any;
  try { raw = await c.req.json(); } catch { raw = null; }

  if (invalidStepInput(raw, true)) {
    return c.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'itinerary_id and title are required' }
    }, 400);
  }

  if (!Object.hasOwn(raw, 'start_at') || (raw.start_at !== null && parseToUnixMs(raw.start_at) === null)) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'start_at must be null or a numeric timestamp (milliseconds)' } }, 400);
  }
  const startAt = raw.start_at === null ? null : parseToUnixMs(raw.start_at);
  const endAt = raw.end_at === null ? null : raw.end_at !== undefined ? parseToUnixMs(raw.end_at) : undefined;
  if (raw.end_at !== undefined && raw.end_at !== null && endAt === null) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'end_at must be null or a numeric timestamp (milliseconds)' } }, 400);
  }
  if (startAt === null && raw.end_at === undefined) raw.end_at = null;

  const itineraryService = new ItineraryService(c.env.DB);
  const itinerary = await itineraryService.get(raw.itinerary_id);
  if (!itinerary) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }

  if (itinerary.source_itinerary_id) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot modify steps of a shared snapshot' } }, 403);
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
  try {
    const data = await service.create(payload);
    return c.json({ success: true, data }, 201);
  } catch (error) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Invalid step' } }, 400);
  }
});

steps.put('/batch-date', async (c) => {
  const raw = await c.req.json<{ itinerary_id?: unknown; updates?: unknown }>();
  if (typeof raw.itinerary_id !== 'string' || raw.itinerary_id.length > 128
    || !Array.isArray(raw.updates) || raw.updates.length === 0 || raw.updates.length > 1000) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'itinerary_id and one or more date updates are required' } }, 400);
  }
  const updates = raw.updates.map((update: any) => ({
    id: typeof update?.id === 'string' ? update.id : '',
    start_at: parseToUnixMs(update?.start_at),
    end_at: parseToUnixMs(update?.end_at),
  }));
  if (updates.some((update) => !update.id || update.id.length > 128
    || update.start_at === null || update.end_at === null || update.end_at < update.start_at)
    || new Set(updates.map(update => update.id)).size !== updates.length) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Each update needs a valid id, start_at and end_at' } }, 400);
  }
  const itineraryService = new ItineraryService(c.env.DB);
  const itinerary = await itineraryService.get(raw.itinerary_id);
  if (!itinerary) return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  if (itinerary.source_itinerary_id) return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot modify steps of a shared snapshot' } }, 403);
  if (itinerary.password) {
    const token = extractBearerToken(c.req.header('Authorization'));
    const payload = token ? await verifyToken(token, c.env.JWT_SECRET) : null;
    if (!payload || payload.shioriId !== itinerary.id) return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'You can only edit steps in your own password-protected itinerary' } }, 403);
  }
  const service = new StepService(c.env.DB);
  const existing = await Promise.all(updates.map((update) => service.get(update.id)));
  if (existing.some((step) => !step || step.itinerary_id !== itinerary.id)) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'All steps must belong to this itinerary' } }, 400);
  }
  const data = await service.updateDates(itinerary.id, updates as Array<{ id: string; start_at: number; end_at: number }>);
  return c.json({ success: true, data });
});

steps.put('/:stepId', async (c) => {
  const stepId = c.req.param('stepId');
  let raw: any;
  try { raw = await c.req.json(); } catch { raw = null; }
  if (invalidStepInput(raw, false)) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid step fields' } }, 400);
  }
  const service = new StepService(c.env.DB);

  const existingStep = await service.get(stepId);
  if (!existingStep) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Step not found' } }, 404);
  }

  const itineraryService = new ItineraryService(c.env.DB);
  const itinerary = await itineraryService.get(existingStep.itinerary_id);
  if (!itinerary) {
    return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Itinerary not found' } }, 404);
  }
  if (itinerary.source_itinerary_id) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot modify steps of a shared snapshot' } }, 403);
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
    const parsed = raw.start_at === null ? null : parseToUnixMs(raw.start_at);
    if (raw.start_at !== null && parsed === null) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'start_at must be null or numeric milliseconds' } }, 400);
    }
    updatePayload.start_at = parsed;
  }
  if (raw.end_at !== undefined) {
    const parsedEnd = raw.end_at === null ? null : parseToUnixMs(raw.end_at);
    if (raw.end_at !== null && parsedEnd === null) {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'end_at must be null or numeric milliseconds' } }, 400);
    }
    updatePayload.end_at = parsedEnd;
  }

  try {
    const data = await service.update(stepId, updatePayload as any);
    return c.json({ success: true, data });
  } catch (error) {
    return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Invalid step' } }, 400);
  }
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
  if (itinerary.source_itinerary_id) {
    return c.json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot modify steps of a shared snapshot' } }, 403);
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
