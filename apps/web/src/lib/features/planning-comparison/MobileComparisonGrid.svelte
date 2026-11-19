<script lang="ts">
  import type { PlanGraphNode, PlanGraphEdge } from '@tabitabi/types';
  import StepTypeIcon from '$lib/themes/standard/core/icons/StepTypeIcon.svelte';

  type DrawnNode = { node: PlanGraphNode; y: number; color: string; label: string };
  type Route = { id: string; label: string; ids: string[]; color: string };
  const palette = ['#6499be', '#b785a4', '#5b9a88', '#b0986a', '#8d8bb4', '#5e9995'];

  let { nodes, edges, selectedId, canEdit, onSelect, onInsert }: {
    nodes: DrawnNode[];
    edges: PlanGraphEdge[];
    selectedId: string | null;
    canEdit: boolean;
    onSelect: (id: string) => void;
    onInsert: (from: string | null, to: string | null) => void;
  } = $props();

  // A column represents an actual route through the DAG, rather than an
  // arbitrary group of cards. Shared stops remain linked to their one Step ID.
  const paths = $derived.by(() => {
    const visible = new Set(nodes.map(item => item.node.id));
    const outgoing = new Map<string, PlanGraphEdge[]>();
    const incoming = new Set<string>();
    for (const edge of edges) {
      if (!visible.has(edge.from) || !visible.has(edge.to)) continue;
      outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
      incoming.add(edge.to);
    }
    const roots = nodes.filter(item => !incoming.has(item.node.id)).map(item => item.node.id);
    const result: { ids: string[]; labels: string[] }[] = [];
    let overflow = false;
    const walk = (id: string, ids: string[], labels: string[]) => {
      if (result.length >= 16) { overflow = true; return; }
      if (ids.includes(id)) return;
      const path = [...ids, id];
      const next = outgoing.get(id) ?? [];
      if (!next.length) { result.push({ ids: path, labels }); return; }
      next.forEach((edge, index) => {
        const name = next.length > 1 ? (edge.label.trim() || 'プラン ' + (index + 1)) : '';
        walk(edge.to, path, name ? [...labels, name] : labels);
      });
    };
    roots.forEach(root => walk(root, [], []));
    const routes: Route[] = result.map((path, index) => ({
      id: path.ids.join('/'),
      label: path.labels.join(' / ') || 'プラン ' + (index + 1),
      ids: path.ids,
      color: palette[index % palette.length],
    }));
    return { routes, overflow };
  });
  const routes = $derived(paths.routes);

  // Reuse the desktop graph's topological/time rows, so parallel stops align
  // even when one plan has more stops than another.
  const slots = $derived.by(() => {
    const rows = new Map<number, DrawnNode[]>();
    for (const item of nodes) rows.set(item.y, [...(rows.get(item.y) ?? []), item]);
    return [...rows.entries()].sort(([a], [b]) => a - b).map(([y, items]) => ({
      y, items,
      shared: items.length === 1 && routes.length > 1 &&
        routes.every(route => route.ids.includes(items[0].node.id)),
      date: items.find(item => item.node.start_local)?.node.start_local ?? '',
    }));
  });

  function shortDate(value: string) {
    return value.slice(5, 10).replace('-', '/');
  }
  function timeRange(node: PlanGraphNode) {
    if (!node.start_local) return '日時未定';
    const start = shortDate(node.start_local) +
      (node.start_local.includes('T') ? ' ' + node.start_local.slice(11, 16) : '');
    if (!node.end_local || node.end_local === node.start_local) return start;
    const end = node.end_local.slice(0, 10) === node.start_local.slice(0, 10)
      ? (node.end_local.includes('T') ? node.end_local.slice(11, 16) : '終日')
      : shortDate(node.end_local) + (node.end_local.includes('T') ? ' ' + node.end_local.slice(11, 16) : '');
    return start + ' – ' + end;
  }
  function slotDate(value: string) {
    return value ? shortDate(value) : '未定';
  }
  function sharedCount(id: string) { return routes.filter(route => route.ids.includes(id)).length; }
</script>

<section class="mobile-compare" aria-label="プランの並列比較">
  {#if paths.overflow}<p class="route-warning">表示できるのは先頭16ルートです。すべての予定は「縦一覧」で確認できます。</p>{/if}
  <div class="compare-scroll" role="region" aria-label="プランごとの時間軸を横スクロールして比較" tabindex="0">
    <div class="compare-grid" style:min-width={(62 + routes.length * 148) + 'px'} style:--route-count={routes.length}>
      <div class="route-headers">
        <div class="time-heading">日時</div>
        {#each routes as route (route.id)}
          <div class="route-heading" style:--route-color={route.color}>
            <span class="route-dot"></span>
            <strong title={route.label}>{route.label}</strong>
          </div>
        {/each}
      </div>
      {#each slots as slot (slot.y)}
        <div class="compare-row">
          <div class="time-stamp">{slotDate(slot.date)}</div>
          {#if slot.shared}
            {@const sharedNode = slot.items[0].node}
            <div class="shared-cell">
              <button class="stop-card common-stop" class:is-selected={selectedId === sharedNode.id}
                aria-label={sharedNode.title + 'の共通予定を開く'} aria-pressed={selectedId === sharedNode.id}
                onclick={() => onSelect(sharedNode.id)}>
                <span class="common-label">共通の予定</span>
                <span class="stop-title"><StepTypeIcon type={sharedNode.type} size="sm" /> <strong>{sharedNode.title}</strong></span>
                <span class="stop-time">{timeRange(sharedNode)}</span>
                {#if sharedNode.location}<span class="stop-place">{sharedNode.location}</span>{/if}
                {#if sharedNode.kind === 'choices'}<span class="stop-extra">{sharedNode.options.length}候補</span>{/if}
              </button>
              {#if canEdit}
                <button class="insert-step" aria-label={sharedNode.title + 'の後に予定を追加・接続'}
                  onclick={() => onInsert(sharedNode.id, null)}>＋</button>
              {/if}
            </div>
          {:else}
            {#each routes as route (route.id)}
              <div class="lane-cell" style:--route-color={route.color}>
                {#each slot.items.filter(item => route.ids.includes(item.node.id)) as item (item.node.id)}
                  {@const node = item.node}
                  {@const next = route.ids[route.ids.indexOf(node.id) + 1] ?? null}
                  <div class="stop-wrap">
                    <button class="stop-card" class:is-selected={selectedId === node.id}
                      aria-label={node.title + 'の予定を開く'} aria-pressed={selectedId === node.id}
                      onclick={() => onSelect(node.id)}>
                      {#if sharedCount(node.id) > 1}<span class="common-label">共通</span>{/if}
                      <span class="stop-title"><StepTypeIcon type={node.type} size="sm" /> <strong>{node.title}</strong></span>
                      <span class="stop-time">{timeRange(node)}</span>
                      {#if node.location}<span class="stop-place">{node.location}</span>{/if}
                      {#if node.kind === 'choices'}<span class="stop-extra">{node.options.length}候補</span>{/if}
                    </button>
                    {#if canEdit}
                      <button class="insert-step" aria-label={node.title + 'の後に' + route.label + 'の予定を追加・接続'}
                        onclick={() => onInsert(node.id, next)}>＋</button>
                    {/if}
                  </div>
                {/each}
              </div>
            {/each}
          {/if}
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .mobile-compare{display:none}
  @media(max-width:670px){
    .mobile-compare{display:block;margin-bottom:14px}
    .route-warning{margin:0 0 8px;color:#815e36;font-size:12px}
    .compare-scroll{width:100%;max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;border:1px solid #d8e5dc;border-radius:14px;background:#f8faf7;scrollbar-color:#a5bfad transparent}
    .compare-grid{width:100%}
    .route-headers,.compare-row{display:grid;grid-template-columns:62px repeat(var(--route-count),minmax(148px,1fr))}
    .route-headers{position:relative;border-bottom:1px solid #ccdbd1;background:#f1f6f1}
    .time-heading,.time-stamp{position:sticky;left:0;z-index:2;display:flex;align-items:center;justify-content:center;min-width:0;border-right:1px solid #d9e6db;background:#f1f6f1;font-size:11px;color:#557563;font-variant-numeric:tabular-nums}
    .time-heading{z-index:3;font-size:12px;font-weight:750}
    .route-heading{display:flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:9px 6px;border-bottom:3px solid var(--route-color);text-align:center}
    .route-heading strong{min-width:0;font-size:12px;line-height:1.4;overflow-wrap:anywhere}
    .route-dot{width:7px;height:7px;flex:none;border-radius:50%;background:var(--route-color)}
    .compare-row{min-height:65px;border-bottom:1px solid #e5eee6}
    .compare-row:last-child{border-bottom:0}
    .time-stamp{align-items:flex-start;padding:16px 3px;background:#f8faf7}
    .lane-cell{position:relative;display:grid;align-content:start;gap:8px;min-width:0;padding:9px 6px 10px;border-right:1px solid #e0e9e1}
    .lane-cell::before{content:'';position:absolute;top:0;bottom:0;left:50%;width:2px;background:color-mix(in srgb,var(--route-color) 30%,white)}
    .stop-wrap,.shared-cell{position:relative;z-index:1;min-width:0}
    .shared-cell{grid-column:2/-1;display:flex;align-items:center;gap:7px;padding:9px;background:#edf6ee}
    .stop-card{display:grid;justify-items:start;gap:6px;width:100%;min-width:0;padding:10px 8px;border:1px solid #dce6de;border-top:3px solid var(--route-color,#65a28a);border-radius:11px;background:#fff;box-shadow:0 2px 7px #213d3010;text-align:left;color:#2a4434}
    .stop-card.is-selected{outline:2px solid #378063;outline-offset:1px;background:#f6fbf7}
    .common-stop{border-top-color:#64a58c}
    .common-label{padding:2px 6px;border-radius:999px;background:#e1f0e6;color:#326c50;font-size:10px;font-weight:750}
    .stop-title{display:flex;align-items:flex-start;gap:5px;min-width:0;width:100%;font-size:12px;line-height:1.5}
    .stop-title :global(svg){flex:none;width:16px;height:16px}
    .stop-title strong{min-width:0;overflow-wrap:anywhere}
    .stop-time,.stop-place,.stop-extra{max-width:100%;overflow-wrap:anywhere;color:#60776a;font-size:11px;line-height:1.4;font-variant-numeric:tabular-nums}
    .stop-extra{font-weight:700;color:#326c50}
    .insert-step{display:grid;place-items:center;width:30px;height:30px;min-height:30px;margin:6px auto 0;border:1px dashed #87b49b;border-radius:50%;background:white;color:#2f6657;font-size:18px;font-weight:700}
    .shared-cell .insert-step{flex:none;margin:0 2px 0 0}
    button:focus-visible,.compare-scroll:focus-visible{outline:2px solid #357764;outline-offset:2px}
  }
</style>
