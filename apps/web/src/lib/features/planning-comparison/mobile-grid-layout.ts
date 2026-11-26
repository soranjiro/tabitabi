import type { PlanGraphEdge, PlanGraphNode } from '@tabitabi/types';

export interface MobileDrawNode {
  node: PlanGraphNode;
  x: number;
  y: number;
  color: string;
  label: string;
}

export interface MobileGridEntry {
  item: MobileDrawNode;
  column: number;
  shared: boolean;
  usedByMultiplePaths: boolean;
  incoming: PlanGraphEdge[];
  outgoing: PlanGraphEdge[];
}

export interface MobileGridRow {
  y: number;
  date: string;
  entries: MobileGridEntry[];
}

/**
 * A mobile lane is a visual track, not a root-to-leaf path.
 * Enumerating paths duplicates the same Step after joins and multiplies
 * columns after each new branch. Every visible Step is rendered exactly once.
 */
export function buildMobileComparisonGrid(nodes: MobileDrawNode[], edges: PlanGraphEdge[]) {
  const byId = new Map(nodes.map(item => [item.node.id, item]));
  const incoming = new Map(nodes.map(item => [item.node.id, [] as PlanGraphEdge[]]));
  const outgoing = new Map(nodes.map(item => [item.node.id, [] as PlanGraphEdge[]]));
  for (const edge of edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) continue;
    outgoing.get(edge.from)!.push(edge);
    incoming.get(edge.to)!.push(edge);
  }

  const groups = new Map<number, MobileDrawNode[]>();
  for (const item of nodes) groups.set(item.y, [...(groups.get(item.y) ?? []), item]);
  const ordered = [...nodes].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows = [...groups.entries()].sort(([a], [b]) => a - b);
  const roots = nodes.filter(item => !incoming.get(item.node.id)!.length);
  const leaves = nodes.filter(item => !outgoing.get(item.node.id)!.length);
  const laneCount = Math.max(2, roots.length, leaves.length, ...rows.map(([, items]) => items.length));

  // Count paths in each weakly connected component. A stop spans the full
  // comparison only when every possible path in its component passes through it.
  const component = new Map<string, number>();
  let componentIndex = 0;
  for (const item of ordered) {
    if (component.has(item.node.id)) continue;
    const stack = [item.node.id];
    while (stack.length) {
      const id = stack.pop()!;
      if (component.has(id)) continue;
      component.set(id, componentIndex);
      stack.push(...incoming.get(id)!.map(edge => edge.from), ...outgoing.get(id)!.map(edge => edge.to));
    }
    componentIndex++;
  }
  const before = new Map<string, number>();
  const after = new Map<string, number>();
  for (const item of ordered) {
    const parents = incoming.get(item.node.id)!;
    before.set(item.node.id, parents.length
      ? parents.reduce((total, edge) => total + (before.get(edge.from) ?? 0), 0) : 1);
  }
  for (const item of [...ordered].reverse()) {
    const children = outgoing.get(item.node.id)!;
    after.set(item.node.id, children.length
      ? children.reduce((total, edge) => total + (after.get(edge.to) ?? 0), 0) : 1);
  }
  const totalPaths = new Map<number, number>();
  for (const item of leaves) {
    const id = item.node.id, part = component.get(id)!;
    totalPaths.set(part, (totalPaths.get(part) ?? 0) + (before.get(id) ?? 1));
  }
  const pathCount = (id: string) => (before.get(id) ?? 1) * (after.get(id) ?? 1);
  const shared = (id: string) => {
    const total = totalPaths.get(component.get(id)!) ?? 1;
    return total > 1 && pathCount(id) === total;
  };

  // Use the desktop graph's horizontal positions for stable visual tracks.
  // Only actual parallel stops define the bounds; shared trunk nodes do not.
  const parallel = rows.filter(([, items]) => items.length > 1).flatMap(([, items]) => items);
  const extent = parallel.length ? parallel : nodes;
  const xs = extent.map(item => item.x);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const preferredColumn = (x: number) => maxX === minX ? 0
    : Math.round(((x - minX) / (maxX - minX)) * (laneCount - 1));
  const gridRows: MobileGridRow[] = rows.map(([y, items]) => {
    const sorted = [...items].sort((a, b) => a.x - b.x);
    let previous = -1;
    const entries = sorted.map((item, index): MobileGridEntry => {
      const remaining = sorted.length - index - 1;
      const isShared = sorted.length === 1 && shared(item.node.id);
      const column = isShared ? 0 : Math.max(previous + 1,
        Math.min(laneCount - remaining - 1, Math.max(0, preferredColumn(item.x))));
      previous = column;
      return {
        item, column, shared: isShared,
        usedByMultiplePaths: pathCount(item.node.id) > 1,
        incoming: incoming.get(item.node.id)!,
        outgoing: outgoing.get(item.node.id)!,
      };
    });
    return { y, entries, date: items.find(item => item.node.start_local)?.node.start_local ?? '' };
  });

  // Display the first actual branch's labels; the card also carries its
  // current incoming edge label when a later split is named differently.
  const firstParallel = gridRows.find(row => row.entries.length > 1);
  const laneLabels = Array.from({ length: laneCount }, (_, column) => {
    const entry = firstParallel?.entries.find(value => value.column === column);
    return entry?.item.label || entry?.incoming.find(edge => edge.label)?.label || 'プラン ' + (column + 1);
  });
  return { rows: gridRows, laneCount, laneLabels };
}
