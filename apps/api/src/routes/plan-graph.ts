import { Hono, type Context } from 'hono';
import { type PlanGraph, type PlanGraphEdge, type PlanGraphNode } from '@tabitabi/types';
import { ItineraryService } from '../services/itinerary.service';
import { optionalAuthMiddleware } from '../middleware/auth';
import type { Env, Variables } from '../utils';

import { graphSchema } from '../validators/plan-graph';

const route = new Hono<{ Bindings: Env; Variables: Variables }>();
route.use('/:id/plan-graph', optionalAuthMiddleware);
type GraphRow = { itinerary_id: string; nodes_json: string; edges_json: string; revision: number; updated_at: string };
const error = (code: string, message: string) => ({ success: false as const, error: { code, message } });
async function access(c: Context<{ Bindings: Env; Variables: Variables }>, id: string, write: boolean) {
  const itinerary = await new ItineraryService(c.env.DB).get(id);
  if (!itinerary) return 'NOT_FOUND';
  if (write && itinerary.source_itinerary_id) return 'FORBIDDEN';
  // The full graph can reveal future destinations even when step details are masked.
  // Do not expose secret-trip branching data to unauthenticated viewers.
  if ((itinerary.password || itinerary.secret_settings?.enabled) && c.get('shioriId') !== id) return 'FORBIDDEN';
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
