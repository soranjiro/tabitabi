<script lang="ts">
  interface Props {
    visited: number;
    total: number;
    avgRating: number;
    avgTottonoi: number;
  }

  let { visited, total, avgRating, avgTottonoi }: Props = $props();

  const progressPct = $derived(total > 0 ? Math.round((visited / total) * 100) : 0);
  const totonoiPct = $derived(Math.round((avgTottonoi / 5) * 100));
</script>

<div class="tm-container">
  <div class="tm-stats">
    <div class="tm-stat">
      <span class="tm-num">{visited}</span>
      <span class="tm-lbl">達成</span>
    </div>
    <span class="tm-sep">/</span>
    <div class="tm-stat">
      <span class="tm-num">{total}</span>
      <span class="tm-lbl">施設</span>
    </div>
    {#if avgRating > 0}
      <div class="tm-divider"></div>
      <div class="tm-stat">
        <span class="tm-num tm-num-sm">★{avgRating.toFixed(1)}</span>
        <span class="tm-lbl">平均評価</span>
      </div>
    {/if}
    {#if avgTottonoi > 0}
      <div class="tm-divider"></div>
      <div class="tm-stat">
        <span class="tm-num tm-num-sm">🤯 {avgTottonoi.toFixed(1)}</span>
        <span class="tm-lbl">整い度</span>
      </div>
    {/if}
  </div>

  <div class="tm-bars">
    <div class="tm-bar-row">
      <span class="tm-bar-lbl">進捗</span>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {progressPct}%"></div>
      </div>
      <span class="tm-bar-pct">{progressPct}%</span>
    </div>
    {#if avgTottonoi > 0}
      <div class="tm-bar-row">
        <span class="tm-bar-lbl">整いメーター</span>
        <div class="progress-bar">
          <div
            class="progress-fill"
            style="width: {totonoiPct}%; background: linear-gradient(90deg, #7b1fa2 0%, #e040fb 50%, #fff 100%);"
          ></div>
        </div>
        <span class="tm-bar-pct">{avgTottonoi.toFixed(1)}/5</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .tm-container {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    border-radius: 16px;
    padding: 1rem 1.5rem;
    margin-bottom: 1rem;
  }

  .tm-stats {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
    flex-wrap: wrap;
  }

  .tm-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .tm-num {
    font-size: 1.8rem;
    font-weight: bold;
    color: white;
    line-height: 1;
  }

  .tm-num-sm {
    font-size: 1.2rem;
  }

  .tm-lbl {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 0.1rem;
  }

  .tm-sep {
    font-size: 1.5rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 300;
  }

  .tm-divider {
    width: 1px;
    height: 2rem;
    background: rgba(255, 255, 255, 0.3);
    margin: 0 0.25rem;
  }

  .tm-bars {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .tm-bar-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .tm-bar-lbl {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.85);
    white-space: nowrap;
    min-width: 80px;
  }

  .tm-bar-pct {
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.85);
    white-space: nowrap;
    min-width: 42px;
    text-align: right;
  }
</style>
