<script lang="ts">
  import type { PlanGraphEdge, PlanGraphNode } from '@tabitabi/types';
  import StepTypeIcon from '$lib/themes/standard/core/icons/StepTypeIcon.svelte';
  import { buildMobileComparisonGrid, type MobileDrawNode } from './mobile-grid-layout';

  let { nodes, edges, selectedId, canEdit, joining = false, onSelect, onInsert, onAppend }: {
    nodes: MobileDrawNode[];
    edges: PlanGraphEdge[];
    selectedId: string | null;
    canEdit: boolean;
    joining?: boolean;
    onSelect: (id: string) => void;
    onInsert: (from: string | null, to: string | null) => void;
    onAppend: (from: string) => void;
  } = $props();

  const grid = $derived(buildMobileComparisonGrid(nodes, edges));
  const titles = $derived(new Map(nodes.map(item => [item.node.id, item.node.title])));
  function shortDate(value: string) { return value.slice(5, 10).replace('-', '/'); }
  function timeRange(node: PlanGraphNode) {
    if (!node.start_local) return '日時未定';
    const start = shortDate(node.start_local) +
      (node.start_local.includes('T') ? ' ' + node.start_local.slice(11, 16) : ' · 時刻未定');
    if (!node.end_local || node.end_local === node.start_local) return start;
    const end = node.end_local.slice(0, 10) === node.start_local.slice(0, 10)
      ? (node.end_local.includes('T') ? node.end_local.slice(11, 16) : '終日')
      : shortDate(node.end_local) + (node.end_local.includes('T') ? ' ' + node.end_local.slice(11, 16) : '');
    return start + ' – ' + end;
  }
</script>

<section class="mobile-compare" aria-label="プランの並列比較">
  <div class="compare-scroll" role="region" aria-label="プランごとの時間軸を横スクロールして比較" tabindex="0">
    <div class="compare-grid" style:min-width={(46 + grid.laneCount * 154) + 'px'} style:--lane-count={grid.laneCount}>
      <div class="route-headers">
        <div class="time-heading">日時</div>
        {#each grid.laneLabels as label, index (index)}
          <div class="route-heading" style:--route-color={['#6499be', '#b785a4', '#5b9a88', '#b0986a', '#8d8bb4', '#5e9995'][index % 6]}>
            <span class="route-dot"></span><strong title={label}>{label}</strong>
          </div>
        {/each}
      </div>
      {#each grid.rows as row (row.y)}
        <div class="compare-row">
          <div class="time-stamp">{row.date ? shortDate(row.date) : '未定'}</div>
          {#each row.entries as entry (entry.item.node.id)}
            {@const node = entry.item.node}
            <div class="lane-cell" class:shared-cell={entry.shared}
              style:grid-column={entry.shared ? '2 / -1' : String(entry.column + 2)}
              style:--route-color={entry.item.color}>
              {#if canEdit && entry.incoming.length === 0}
                <button class="insert-step before-step" aria-label={node.title + 'の前に予定を追加'}
                  onclick={() => onInsert(null, node.id)}>＋ <span>前に追加</span></button>
              {/if}
              <button class="stop-card" class:is-selected={selectedId === node.id}
                aria-label={joining ? node.title + 'に合流' : node.title + 'の予定を開く'}
                aria-pressed={selectedId === node.id} onclick={() => onSelect(node.id)}>
                {#if entry.shared}<span class="common-label">共通の予定</span>
                {:else if entry.usedByMultiplePaths}<span class="common-label">複数プラン共通</span>{/if}
                {#if entry.item.label && !entry.shared}<span class="lane-label">{entry.item.label}</span>{/if}
                {#if entry.outgoing.length > 1}<span class="event-label">分岐</span>
                {:else if entry.incoming.length > 1}<span class="event-label">合流</span>{/if}
                <span class="stop-title"><StepTypeIcon type={node.type} size="sm" /><strong>{node.title}</strong></span>
                <span class="stop-time">{timeRange(node)}</span>
                {#if node.location}<span class="stop-place">{node.location}</span>{/if}
                {#if node.participants.length}<span class="stop-place">{node.participants.join('・')}</span>{/if}
                {#if node.kind === 'choices'}<span class="stop-extra">{node.options.length}候補{node.selected_option_id ? ' · 選択済み' : ''}</span>{/if}
                {#if node.notes || node.link}<span class="stop-extra">{node.notes ? 'メモ' : ''}{node.notes && node.link ? ' · ' : ''}{node.link ? 'リンク' : ''}</span>{/if}
              </button>
              {#if canEdit}
                <div class="insert-actions">
                  {#if entry.outgoing.length === 0}
                    <button class="insert-step" aria-label={node.title + 'の次の予定を追加'}
                      onclick={() => onAppend(node.id)}>＋ <span>次の予定</span></button>
                    <button class="insert-step more-step" aria-label={node.title + 'の後に予定を追加・接続'}
                      onclick={() => onInsert(node.id, null)}>⋯</button>
                  {:else if entry.outgoing.length === 1}
                    <button class="insert-step" aria-label={node.title + 'の後に予定を追加・接続'}
                      onclick={() => onInsert(node.id, entry.outgoing[0].to)}>＋ <span>途中に追加</span></button>
                  {:else}
                    {#each entry.outgoing as edge (edge.id)}
                      <button class="insert-step" aria-label={(titles.get(edge.to) ?? '次の予定') + 'の前に予定を追加'}
                        onclick={() => onInsert(node.id, edge.to)}>＋ <span>{edge.label || titles.get(edge.to) || '追加'}</span></button>
                    {/each}
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>
</section>

<style>
  .mobile-compare{display:none}
  @media(max-width:670px){
    .mobile-compare{display:block;margin:0 0 14px;min-width:0}
    .compare-scroll{width:100%;max-width:100%;overflow-x:auto;overscroll-behavior-x:contain;border:1px solid #d8e5dc;border-radius:14px;background:#f8faf7;scrollbar-color:#a5bfad transparent}
    .compare-grid{width:100%}
    .route-headers,.compare-row{display:grid;grid-template-columns:46px repeat(var(--lane-count),minmax(154px,1fr))}
    .route-headers{border-bottom:1px solid #ccdbd1;background:#f1f6f1}
    .time-heading,.time-stamp{position:sticky;left:0;z-index:2;display:flex;align-items:center;justify-content:center;min-width:0;border-right:1px solid #d9e6db;background:#f1f6f1;color:#557563;font-size:10px;font-variant-numeric:tabular-nums}
    .time-heading{z-index:3;font-size:11px;font-weight:750}
    .route-heading{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:8px 6px;border-bottom:3px solid var(--route-color);text-align:center}
    .route-heading strong{min-width:0;font-size:12px;line-height:1.4;overflow-wrap:anywhere}
    .route-dot{width:7px;height:7px;flex:none;border-radius:50%;background:var(--route-color)}
    .compare-row{min-height:70px;border-bottom:1px solid #e4ede6;background:repeating-linear-gradient(90deg,#f9fbf9 0,#f9fbf9 1px,#fff 1px,#fff 154px)}
    .compare-row:last-child{border-bottom:0}
    .time-stamp{align-items:flex-start;padding:16px 1px;white-space:nowrap;background:#f8faf7}
    .lane-cell{position:relative;display:grid;align-content:start;justify-items:stretch;gap:6px;min-width:0;padding:10px 6px 12px;border-right:1px solid #e0e9e1}
    .lane-cell::before{content:'';position:absolute;top:0;bottom:0;left:50%;width:2px;background:color-mix(in srgb,var(--route-color) 30%,white)}
    .shared-cell{padding:10px;background:#edf6ee}
    .shared-cell::before{display:none}
    .stop-card{position:relative;z-index:1;display:grid;justify-items:start;gap:5px;width:100%;min-width:0;padding:10px 9px;border:1px solid #dce6de;border-top:3px solid var(--route-color,#65a28a);border-radius:11px;background:#fff;box-shadow:0 2px 7px #213d3010;text-align:left;color:#2a4434}
    .stop-card.is-selected{outline:2px solid #378063;outline-offset:1px;background:#f6fbf7}
    .shared-cell .stop-card{border-top-color:#64a58c}
    .common-label,.event-label,.lane-label{max-width:100%;padding:2px 6px;border-radius:999px;background:#e1f0e6;color:#326c50;font-size:10px;font-weight:750;overflow-wrap:anywhere}
    .event-label{background:#eaf0fa;color:#42638b}
    .lane-label{background:#f1f4f3;color:#4f6c60}
    .stop-title{display:flex;align-items:flex-start;gap:5px;min-width:0;width:100%;font-size:12px;line-height:1.45}
    .stop-title :global(svg){flex:none;width:16px;height:16px}
    .stop-title strong{min-width:0;overflow-wrap:anywhere}
    .stop-time,.stop-place,.stop-extra{max-width:100%;overflow-wrap:anywhere;color:#60776a;font-size:11px;line-height:1.45;font-variant-numeric:tabular-nums}
    .stop-extra{font-weight:700;color:#326c50}
    .insert-actions{position:relative;z-index:1;display:flex;flex-wrap:wrap;justify-content:center;gap:5px}
    .insert-step{position:relative;z-index:1;display:inline-flex;align-items:center;justify-content:center;gap:4px;max-width:100%;min-height:30px;padding:4px 9px;border:1px dashed #87b49b;border-radius:999px;background:white;color:#2f6657;font-size:14px;font-weight:700}
    .insert-step span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px}
    .before-step{justify-self:center}
    .more-step{min-width:30px;font-size:18px}
    button:focus-visible,.compare-scroll:focus-visible{outline:2px solid #357764;outline-offset:2px}
  }
</style>
