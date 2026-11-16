import { Hono, type Context } from 'hono';
import { z } from 'zod';
import { STEP_TYPE, type PlanGraph, type PlanGraphEdge, type PlanGraphNode } from '@tabitabi/types';
import { ItineraryService } from '../services/itinerary.service';
import { optionalAuthMiddleware } from '../middleware/auth';
import type { Env, Variables } from '../utils';

const route = new Hono<{ Bindings: Env; Variables: Variables }>();
route.use('/:id/plan-graph', optionalAuthMiddleware);
const urlSchema = z.string().max(2048).refine(value => {
  if (!value) return true;
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
});
const dateSchema = z.string().max(32).refine(value => !value || /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(value));
const optionSchema = z.object({
  id: z.string().min(1).max(64), title: z.string().trim().min(1).max(140),
  provider: z.string().max(100), amount: z.number().int().min(0).max(1_000_000_000_000).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/), start_local: dateSchema, end_local: dateSchema,
  from: z.string().max(140), to: z.string().max(140),
  cancellation: z.string().max(300), url: urlSchema, notes: z.string().max(2000),
}).strict();
const nodeSchema = z.object({
  id: z.string().min(1).max(64),
  kind: z.enum(['step', 'choices']),
  title: z.string().trim().min(1).max(140),
  type: z.enum(Object.values(STEP_TYPE) as [string, ...string[]]),
  start_local: dateSchema, end_local: dateSchema,
  location: z.string().max(250), notes: z.string().max(2000), link: urlSchema,
  amount: z.number().int().min(0).max(1_000_000_000_000).nullable(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  participants: z.array(z.string().trim().min(1).max(40)).max(20),
  options: z.array(optionSchema).max(30),
  selected_option_id: z.string().min(1).max(64).nullable(),
}).strict();
const edgeSchema = z.object({
  id: z.string().min(1).max(64), from: z.string().min(1).max(64),
  to: z.string().min(1).max(64), label: z.string().max(80),
}).strict();
const graphSchema = z.object({
  revision: z.number().int().min(0),
  nodes: z.array(nodeSchema).max(100),
  edges: z.array(edgeSchema).max(200),
}).strict().superRefine((graph, ctx) => {
  const ids = new Set(graph.nodes.map(node => node.id));
  if (ids.size !== graph.nodes.length || new Set(graph.edges.map(edge => edge.id)).size !== graph.edges.length) {
    ctx.addIssue({ code: 'custom', message: 'Duplicate graph IDs' }); return;
  }
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const inDegree = new Map(graph.nodes.map(node => [node.id, 0]));
  const outgoing = new Map(graph.nodes.map(node => [node.id, [] as string[]]));
  const pairs = new Set<string>();
  for (const node of graph.nodes) {
    if (node.kind === 'step' && (node.options.length || node.selected_option_id)) {
      ctx.addIssue({ code: 'custom', message: 'Only choice nodes may contain alternatives' });
    }
    if (node.selected_option_id && !node.options.some(option => option.id === node.selected_option_id)) {
      ctx.addIssue({ code: 'custom', message: 'Selected option not found' });
    }
    if (new Set(node.options.map(option => option.id)).size !== node.options.length) {
      ctx.addIssue({ code: 'custom', message: 'Duplicate option IDs' });
    }
    if (node.start_local && node.end_local && node.end_local < node.start_local) {
      ctx.addIssue({ code: 'custom', message: 'End time precedes start time' });
    }
  }
  for (const edge of graph.edges) {
    const from = byId.get(edge.from), to = byId.get(edge.to);
    if (!from || !to || from.id === to.id) {
      ctx.addIssue({ code: 'custom', message: 'Invalid graph connection' }); return;
    }
    const pair = edge.from + ':' + edge.to;
    if (pairs.has(pair)) ctx.addIssue({ code: 'custom', message: 'Duplicate graph connection' });
    pairs.add(pair);
    if (from.start_local && to.start_local && from.start_local > to.start_local) {
      ctx.addIssue({ code: 'custom', message: 'Connections must not travel back in time' });
    }
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
    outgoing.get(edge.from)!.push(edge.to);
  }
  const queue = [...inDegree].filter(([, n]) => n === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift()!; visited++;
    for (const to of outgoing.get(id)!) {
      const degree = inDegree.get(to)! - 1;
      inDegree.set(to, degree);
      if (degree === 0) queue.push(to);
    }
  }
  if (visited !== graph.nodes.length) ctx.addIssue({ code: 'custom', message: 'Cycles are not supported' });
});
type GraphRow = { itinerary_id: string; nodes_json: string; edges_json: string; revision: number; updated_at: string };
const error = (code: string, message: string) => ({ success: false as const, error: { code, message } });
async function access(c: Context<{ Bindings: Env; Variables: Variables }>, id: string, write: boolean) {
  const itinerary = await new ItineraryService(c.env.DB).get(id);
  if (!itinerary) return 'NOT_FOUND';
  if (write && itinerary.source_itinerary_id) return 'FORBIDDEN';
  if (itinerary.password && c.get('shioriId') !== id) return 'FORBIDDEN';
  return null;
}
function read(id: string, row: GraphRow | null): PlanGraph {
  return row ? {
    itinerary_id: id, revision: row.revision, nodes: JSON.parse(row.nodes_json) as PlanGraphNode[],
    edges: JSON.parse(row.edges_json) as PlanGraphEdge[], updated_at: row.updated_at,
  } : { itinerary_id: id, revision: 0, nodes: [], edges: [], updated_at: null };
}
route.get('/:id/plan-graph', async c => {
  const id = c.req.param('id')!;
  const denied = await access(c, id, false);
  if (denied) return c.json(error(denied, 'Graph is not available'), denied === 'NOT_FOUND' ? 404 : 403);
  const row = await c.env.DB.prepare('SELECT * FROM itinerary_plan_graphs WHERE itinerary_id = ?')
    .bind(id).first<GraphRow>();
  return c.json({ success: true, data: read(id, row) });
});
route.put('/:id/plan-graph', async c => {
  const id = c.req.param('id')!;
  const denied = await access(c, id, true);
  if (denied) return c.json(error(denied, 'Graph edit permission required'), denied === 'NOT_FOUND' ? 404 : 403);
  const parsed = graphSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json(error('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid graph'), 400);
  const { revision, nodes, edges } = parsed.data;
  const now = new Date().toISOString();
  const jsonNodes = JSON.stringify(nodes), jsonEdges = JSON.stringify(edges);
  if (revision === 0) {
    try {
      await c.env.DB.prepare(
        'INSERT INTO itinerary_plan_graphs (itinerary_id, nodes_json, edges_json, revision, updated_at) VALUES (?, ?, ?, 1, ?)',
      ).bind(id, jsonNodes, jsonEdges, now).run();
      return c.json({ success: true, data: { itinerary_id: id, revision: 1, nodes, edges, updated_at: now } });
    } catch (err) {
      if (!(err instanceof Error) || !err.message.includes('UNIQUE constraint')) throw err;
    }
  } else {
    const result = await c.env.DB.prepare(
      'UPDATE itinerary_plan_graphs SET nodes_json = ?, edges_json = ?, revision = revision + 1, updated_at = ? WHERE itinerary_id = ? AND revision = ?',
    ).bind(jsonNodes, jsonEdges, now, id, revision).run();
    if (result.meta.changes) return c.json({
      success: true, data: { itinerary_id: id, revision: revision + 1, nodes, edges, updated_at: now },
    });
  }
  return c.json(error('CONFLICT', '別の編集がありました。再読み込みしてください。'), 409);
});
export default route;
