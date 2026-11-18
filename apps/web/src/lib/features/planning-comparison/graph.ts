import type { PlanGraphEdge, PlanGraphNode } from '@tabitabi/types';

/** Move just one stop. Keep the old route connected and splice into the destination route. */
export function moveStop(nodes: PlanGraphNode[], edges: PlanGraphEdge[], id: string, after: string, newId: () => string): PlanGraphEdge[] {
  if (id === after || !nodes.some(n => n.id === id) || !nodes.some(n => n.id === after)) throw new Error('移動先を選んでください。');
  const incoming = edges.filter(e => e.to === id), outgoing = edges.filter(e => e.from === id);
  if (incoming.length > 1 || outgoing.length > 1) throw new Error('分岐点・合流点は接続を整理してから移動してください。');
  let result = edges.filter(e => e.from !== id && e.to !== id);
  if (incoming[0] && outgoing[0] && !result.some(e => e.from === incoming[0].from && e.to === outgoing[0].to)) {
    result.push({ ...incoming[0], to: outgoing[0].to });
  }
  const next = result.filter(e => e.from === after);
  if (next.length > 1) throw new Error('移動先の分岐より先の予定を選んでください。');
  result = result.filter(e => e !== next[0]);
  result.push({ id: newId(), from: after, to: id, label: next[0]?.label ?? '' });
  if (next[0]) result.push({ id: newId(), from: id, to: next[0].to, label: '' });
  const byId = new Map(nodes.map(n => [n.id, n]));
  for (const e of result) {
    const a = byId.get(e.from)!, b = byId.get(e.to)!;
    if (isReverseTimeOrder(a.start_local, b.start_local)) throw new Error('時刻が前後します。先に予定の日時を編集してください。');
  }
  const done = new Set<string>();
  const visit = (node: string, path: Set<string>): void => {
    if (path.has(node)) throw new Error('同じ予定に戻る接続には移動できません。');
    if (done.has(node)) return;
    const nextPath = new Set([...path, node]);
    result.filter(e => e.from === node).forEach(e => visit(e.to, nextPath));
    done.add(node);
  };
  // A moved stop is the only possible new source of a cycle.
  visit(id, new Set());
  return result;
}


/** Date-only stops have no time order within their day. */
export function isReverseTimeOrder(from: string, to: string): boolean {
  if (!from || !to) return false;
  return from.includes('T') && to.includes('T')
    ? from > to : from.slice(0, 10) > to.slice(0, 10);
}

/** Validate all graph connections before presenting a move or persisting it. */
function validateConnections(nodes: PlanGraphNode[], edges: PlanGraphEdge[]): void {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const forward = new Map(nodes.map(node => [node.id, [] as string[]]));
  const indegree = new Map(nodes.map(node => [node.id, 0]));
  const pairs = new Set<string>();
  for (const edge of edges) {
    const a = byId.get(edge.from), b = byId.get(edge.to);
    if (!a || !b || a.id === b.id) throw new Error('接続先の予定が見つかりません。');
    const pair = edge.from + ':' + edge.to;
    if (pairs.has(pair)) throw new Error('同じ接続が重複しています。');
    pairs.add(pair);
    if (isReverseTimeOrder(a.start_local, b.start_local)) {
      throw new Error('時刻が前後します。先に予定の日時を編集してください。');
    }
    forward.get(a.id)!.push(b.id);
    indegree.set(b.id, indegree.get(b.id)! + 1);
  }
  const queue = [...indegree].filter(([, degree]) => degree === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length) {
    const current = queue.shift()!;
    visited++;
    for (const to of forward.get(current)!) {
      const left = indegree.get(to)! - 1;
      indegree.set(to, left);
      if (left === 0) queue.push(to);
    }
  }
  if (visited !== nodes.length) throw new Error('同じ予定に戻る接続は作れません。');
}

/**
 * Insert a freshly created stop into a specific connection, or before a root /
 * after a leaf. Never silently branch off an existing connection.
 */
export function insertCreatedStop(
  nodes: PlanGraphNode[], edges: PlanGraphEdge[], id: string,
  from: string | null, to: string | null, newId: () => string,
): PlanGraphEdge[] {
  if (!nodes.some(node => node.id === id) || from === id || to === id ||
      edges.some(edge => edge.from === id || edge.to === id)) throw new Error('挿入する予定が見つかりません。');
  if (from && !nodes.some(node => node.id === from)) throw new Error('挿入元が見つかりません。');
  if (to && !nodes.some(node => node.id === to)) throw new Error('挿入先が見つかりません。');
  const between = from && to ? edges.find(edge => edge.from === from && edge.to === to) : null;
  if (from && to && !between) throw new Error('予定の接続が変更されています。再読み込みしてください。');
  if (!from && to && edges.some(edge => edge.to === to)) throw new Error('先頭の予定を選んでください。');
  if (from && !to && edges.some(edge => edge.from === from)) throw new Error('最後の予定を選んでください。');
  const result = edges.filter(edge => edge !== between);
  if (from) result.push({ id: newId(), from, to: id, label: between?.label ?? '' });
  if (to) result.push({ id: newId(), from: id, to, label: '' });
  validateConnections(nodes, result);
  return result;
}

/**
 * Relocate an existing, non-junction stop to a specific gap. The old neighbors
 * are reconnected; no duplicate Step is created, even across different plans.
 */
export function placeExistingStop(
  nodes: PlanGraphNode[], edges: PlanGraphEdge[], id: string,
  from: string | null, to: string | null, newId: () => string,
): PlanGraphEdge[] {
  if (id === from || id === to || !nodes.some(node => node.id === id)) {
    throw new Error('移動する予定を選んでください。');
  }
  const incoming = edges.filter(edge => edge.to === id);
  const outgoing = edges.filter(edge => edge.from === id);
  if (incoming.length > 1 || outgoing.length > 1) {
    throw new Error('分岐点・合流点は接続を整理してから移動してください。');
  }
  let remaining = edges.filter(edge => edge.from !== id && edge.to !== id);
  if (incoming[0] && outgoing[0] &&
      !remaining.some(edge => edge.from === incoming[0].from && edge.to === outgoing[0].to)) {
    remaining.push({ ...incoming[0], to: outgoing[0].to });
  }
  return insertCreatedStop(nodes, remaining, id, from, to, newId);
}

/** A persisted single route must follow the itinerary's latest date and time. */
export function chronologicalLinearEdges(
  orderedIds: string[], edges: PlanGraphEdge[], newId: (index: number) => string,
): PlanGraphEdge[] | null {
  if (!orderedIds.length) return [];
  if (edges.length !== orderedIds.length - 1) return null;
  const ids = new Set(orderedIds);
  const from = new Set<string>(), to = new Set<string>();
  for (const edge of edges) {
    if (!ids.has(edge.from) || !ids.has(edge.to) || from.has(edge.from) || to.has(edge.to)) return null;
    from.add(edge.from); to.add(edge.to);
  }
  // Ignore a disconnected forest, and leave all genuine branching untouched.
  if (orderedIds.filter(id => !to.has(id)).length !== 1) return null;
  const routeName = edges.find(edge => edge.label.trim())?.label ?? '';
  return orderedIds.slice(1).map((id, index) => ({
    id: edges[index]?.id ?? newId(index),
    from: orderedIds[index], to: id,
    label: index === 0 ? routeName : '',
  }));
}
