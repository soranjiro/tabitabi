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
    if (a.start_local && b.start_local && a.start_local > b.start_local) throw new Error('時刻が前後します。先に予定の日時を編集してください。');
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
