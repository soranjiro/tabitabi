import { Hono, type Context } from 'hono';
import { z } from 'zod';
import type { ComparisonGroup, ComparisonOption } from '@tabitabi/types';
import { ItineraryService } from '../services/itinerary.service';
import { optionalAuthMiddleware } from '../middleware/auth';
import type { Env, Variables } from '../utils';

const comparisons = new Hono<{ Bindings: Env; Variables: Variables }>();

const kindSchema = z.enum(['flight', 'stay', 'transport', 'other']);
const urlSchema = z.string().max(2048).refine((value) => {
  if (!value) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
}, 'The option link must use HTTPS or HTTP');

const optionSchema = z.object({
  id: z.string().min(1).max(64),
  title: z.string().trim().min(1).max(140),
  provider: z.string().max(100),
  amount: z.number().int().min(0).max(1_000_000_000_000).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  start_local: z.string().max(32),
  end_local: z.string().max(32),
  from: z.string().max(140),
  to: z.string().max(140),
  cancellation: z.string().max(300),
  url: urlSchema,
  notes: z.string().max(2000),
}).strict();
const optionsSchema = z.array(optionSchema).max(50).refine(
  (options) => new Set(options.map((option) => option.id)).size === options.length,
  'Option IDs must be unique',
);
const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  kind: kindSchema,
}).strict();
const updateSchema = z.object({
  revision: z.number().int().positive(),
  title: z.string().trim().min(1).max(120).optional(),
  options: optionsSchema.optional(),
  selected_option_id: z.string().min(1).max(64).nullable().optional(),
}).strict();

interface GroupRow {
  id: string; itinerary_id: string; title: string; kind: ComparisonGroup['kind'];
  options_json: string; selected_option_id: string | null; revision: number;
  created_at: string; updated_at: string;
}

function toGroup(row: GroupRow): ComparisonGroup {
  return {
    id: row.id, itinerary_id: row.itinerary_id, title: row.title, kind: row.kind,
    options: JSON.parse(row.options_json) as ComparisonOption[],
    selected_option_id: row.selected_option_id, revision: row.revision,
    created_at: row.created_at, updated_at: row.updated_at,
  };
}

async function canAccess(c: Context<{ Bindings: Env; Variables: Variables }>, id: string, write = false) {
  const itinerary = await new ItineraryService(c.env.DB).get(id);
  if (!itinerary) return 'NOT_FOUND';
  // Published snapshots expose only separately copied, sanitized candidates.
  if (write && itinerary.source_itinerary_id) return 'FORBIDDEN';
  // Protected source itineraries still require an edit token.
  if (itinerary.password && c.get('shioriId') !== id) return 'FORBIDDEN';
  return null;
}

const notFound = { success: false as const, error: { code: 'NOT_FOUND', message: 'Itinerary or comparison not found' } };
const forbidden = { success: false as const, error: { code: 'FORBIDDEN', message: 'Comparison edit permission required' } };
const invalid = { success: false as const, error: { code: 'VALIDATION_ERROR', message: 'Invalid comparison details' } };

comparisons.use('/:id/comparisons/*', optionalAuthMiddleware);
comparisons.use('/:id/comparisons', optionalAuthMiddleware);

comparisons.get('/:id/comparisons', async (c) => {
  const id = c.req.param('id');
  const denial = await canAccess(c, id, c.req.method !== 'GET');
  if (denial) return c.json(denial === 'NOT_FOUND' ? notFound : forbidden, denial === 'NOT_FOUND' ? 404 : 403);
  const rows = await c.env.DB.prepare(
    'SELECT * FROM itinerary_comparison_groups WHERE itinerary_id = ? ORDER BY created_at ASC, id ASC',
  ).bind(id).all<GroupRow>();
  return c.json({ success: true, data: (rows.results ?? []).map(toGroup) });
});

comparisons.post('/:id/comparisons', async (c) => {
  const id = c.req.param('id');
  const denial = await canAccess(c, id, c.req.method !== 'GET');
  if (denial) return c.json(denial === 'NOT_FOUND' ? notFound : forbidden, denial === 'NOT_FOUND' ? 404 : 403);
  const parsed = createSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(invalid, 400);

  const count = await c.env.DB.prepare(
    'SELECT COUNT(*) AS n FROM itinerary_comparison_groups WHERE itinerary_id = ?',
  ).bind(id).first<{ n: number }>();
  if ((count?.n ?? 0) >= 40) {
    return c.json({ success: false, error: { code: 'LIMIT_REACHED', message: 'Comparison group limit reached' } }, 400);
  }
  const groupId = crypto.randomUUID();
  const now = new Date().toISOString();
  await c.env.DB.prepare(
    'INSERT INTO itinerary_comparison_groups (id, itinerary_id, title, kind, options_json, selected_option_id, revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NULL, 1, ?, ?)',
  ).bind(groupId, id, parsed.data.title, parsed.data.kind, '[]', now, now).run();
  return c.json({ success: true, data: {
    id: groupId, itinerary_id: id, title: parsed.data.title, kind: parsed.data.kind,
    options: [], selected_option_id: null, revision: 1, created_at: now, updated_at: now,
  } satisfies ComparisonGroup }, 201);
});

comparisons.put('/:id/comparisons/:groupId', async (c) => {
  const id = c.req.param('id');
  const denial = await canAccess(c, id, c.req.method !== 'GET');
  if (denial) return c.json(denial === 'NOT_FOUND' ? notFound : forbidden, denial === 'NOT_FOUND' ? 404 : 403);
  const parsed = updateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(invalid, 400);

  const row = await c.env.DB.prepare(
    'SELECT * FROM itinerary_comparison_groups WHERE id = ? AND itinerary_id = ?',
  ).bind(c.req.param('groupId'), id).first<GroupRow>();
  if (!row) return c.json(notFound, 404);

  const options = parsed.data.options ?? toGroup(row).options;
  const selected = parsed.data.selected_option_id === undefined
    ? row.selected_option_id : parsed.data.selected_option_id;
  if (selected !== null && !options.some((option) => option.id === selected)) {
    return c.json(invalid, 400);
  }
  const title = parsed.data.title ?? row.title;
  const now = new Date().toISOString();
  const write = await c.env.DB.prepare(
    'UPDATE itinerary_comparison_groups SET title = ?, options_json = ?, selected_option_id = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND itinerary_id = ? AND revision = ?',
  ).bind(title, JSON.stringify(options), selected, now, row.id, id, parsed.data.revision).run();
  if (!write.meta.changes) {
    return c.json({ success: false, error: { code: 'CONFLICT', message: '別の編集がありました。再読み込みして確認してください。' } }, 409);
  }
  return c.json({ success: true, data: {
    ...toGroup(row), title, options, selected_option_id: selected,
    revision: parsed.data.revision + 1, updated_at: now,
  } satisfies ComparisonGroup });
});

comparisons.delete('/:id/comparisons/:groupId', async (c) => {
  const id = c.req.param('id');
  const denial = await canAccess(c, id, c.req.method !== 'GET');
  if (denial) return c.json(denial === 'NOT_FOUND' ? notFound : forbidden, denial === 'NOT_FOUND' ? 404 : 403);
  const result = await c.env.DB.prepare(
    'DELETE FROM itinerary_comparison_groups WHERE id = ? AND itinerary_id = ?',
  ).bind(c.req.param('groupId'), id).run();
  if (!result.meta.changes) return c.json(notFound, 404);
  return c.json({ success: true, data: null });
});

export default comparisons;
