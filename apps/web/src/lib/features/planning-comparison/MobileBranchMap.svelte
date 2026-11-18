<script lang="ts">
  import type { PlanGraphEdge, PlanGraphNode } from '@tabitabi/types';

  let { nodes, edges, onSelect }: {
    nodes: PlanGraphNode[];
    edges: PlanGraphEdge[];
    onSelect: (id: string) => void;
  } = $props();

  const palette = ['#6499be', '#b785a4', '#5b9a88', '#b0986a', '#8d8bb4', '#5e9995'];

  function distances(start: string): Map<string, number> {
    const found = new Map([[start, 0]]);
    const queue = [start];
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      const depth = found.get(current)!;
      for (const edge of edges) {
        if (edge.from !== current || found.has(edge.to)) continue;
        found.set(edge.to, depth + 1);
        queue.push(edge.to);
      }
    }
    return found;
  }

  const forks = $derived.by(() => {
    const byId = new Map(nodes.map(node => [node.id, node]));
    return nodes.flatMap(source => {
      const routes = edges.filter(edge => edge.from === source.id && byId.has(edge.to));
      if (routes.length < 2) return [];
      const paths = routes.map(edge => distances(edge.to));
      // A common destination is a real convergence, not a visually adjacent stop.
      const common = [...paths[0].keys()]
        .filter(id => paths.every(path => path.has(id)))
        .sort((a, b) => paths.reduce((sum, path) => sum + path.get(a)!, 0)
          - paths.reduce((sum, path) => sum + path.get(b)!, 0))[0];
      return [{
        id: source.id, title: source.title,
        merge: common ? byId.get(common) ?? null : null,
        routes: routes.map((edge, index) => ({
          id: edge.to,
          title: byId.get(edge.to)!.title,
          label: edge.label || 'プラン ' + (index + 1),
          color: palette[index % palette.length],
          count: [...paths[index].keys()].filter(id => id !== common).length,
        })),
      }];
    });
  });
</script>

{#if forks.length}
  <details class="mobile-branch-map" open>
    <summary><span class="map-heading">分岐ルート</span><span class="map-count">{forks.length}か所 <span aria-hidden="true">⌄</span></span></summary>
    <div class="branch-maps">
      {#each forks as fork (fork.id)}
        <section class="route-section" aria-label={fork.title + 'からの分岐'}>
          <button class="junction" onclick={() => onSelect(fork.id)} aria-label={fork.title + 'の予定を開く'}>
            <span class="junction-type">共通・分岐元</span>
            <strong>{fork.title}</strong>
          </button>
          <div class="fork-wire" aria-hidden="true"><span></span></div>
          <div class="route-choices">
            {#each fork.routes as route (route.id)}
              <button class="route-choice" style:--route-color={route.color}
                onclick={() => onSelect(route.id)} aria-label={route.label + '：' + route.title + 'の予定を開く'}>
                <span class="route-label">{route.label}</span>
                <strong>{route.title}</strong>
                <small>{route.count}件の予定</small>
              </button>
            {/each}
          </div>
          {#if fork.merge}
            <div class="merge-wire" aria-hidden="true"><span></span></div>
            <button class="junction merge" onclick={() => onSelect(fork.merge!.id)} aria-label={fork.merge.title + 'の合流予定を開く'}>
              <span class="junction-type">合流・共通</span>
              <strong>{fork.merge.title}</strong>
            </button>
          {:else}
            <div class="independent-end">別々のルート</div>
          {/if}
        </section>
      {/each}
    </div>
  </details>
{/if}

<style>
  .mobile-branch-map{display:none}
  @media(max-width:670px){
    .mobile-branch-map{display:block;margin:0 0 18px;border:1px solid #d9e5dc;border-radius:16px;background:#f7faf7;overflow:hidden}
    summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 15px;cursor:pointer;list-style:none;color:#305e4b}
    summary::-webkit-details-marker{display:none}
    summary:focus-visible,button:focus-visible{outline:2px solid #2f6657;outline-offset:2px}
    .map-heading{font-size:14px;font-weight:750}
    .map-count{font-size:12px;color:#617b69}
    .branch-maps{display:grid;gap:12px;padding:0 12px 14px}
    .route-section{display:grid;justify-items:center;min-width:0;padding:12px;border:1px solid #e5ece5;border-radius:13px;background:white}
    .junction{width:min(100%,240px);display:grid;gap:3px;justify-items:center;min-height:50px;padding:9px 12px;border:1px solid #cbded0;border-radius:12px;background:#f7fbf8;color:#234c3a;text-align:center}
    .junction-type{font-size:10px;color:#597967;letter-spacing:.02em}
    .junction strong{font-size:13px;line-height:1.45;overflow-wrap:anywhere}
    .fork-wire,.merge-wire{height:25px;position:relative;width:74%;min-width:130px}
    .fork-wire::before,.merge-wire::before{content:'';position:absolute;left:50%;height:12px;border-left:2px solid #a8c5b5;transform:translateX(-50%)}
    .fork-wire::before{top:0}.merge-wire::before{bottom:0}
    .fork-wire::after,.merge-wire::after{content:'';position:absolute;left:12%;right:12%;height:12px;border:2px solid #a8c5b5}
    .fork-wire::after{bottom:0;border-bottom:0;border-radius:9px 9px 0 0}
    .merge-wire::after{top:0;border-top:0;border-radius:0 0 9px 9px}
    .route-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%}
    .route-choice{min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:10px;border:1px solid #e1e8e1;border-top:3px solid var(--route-color);border-radius:11px;background:#fff;text-align:left;color:#293b31}
    .route-label{font-size:11px;color:#466755;font-weight:750;overflow-wrap:anywhere}
    .route-choice strong{font-size:12px;line-height:1.45;overflow-wrap:anywhere}
    .route-choice small{font-size:10px;color:#708478;margin-top:auto}
    .merge{background:#f1f7f2}
    .independent-end{padding-top:10px;font-size:11px;color:#69816f}
  }
</style>
