import { z } from 'zod';
import { STEP_TYPE } from '@tabitabi/types';

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
  type: z.enum(Object.values(STEP_TYPE)),
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
export const graphSchema = z.object({
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
