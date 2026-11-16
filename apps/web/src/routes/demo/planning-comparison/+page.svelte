<script lang="ts">
  import { onMount } from 'svelte';
  import type { ItineraryResponse, Step, Theme } from '@tabitabi/types';
  import { demoStorage, setDemoMode, resetDemoMode } from '$lib/demo';
  import { getDemoData } from '$lib/features/planning-comparison/demo-data';
  import { loadTheme } from '$lib/themes';
  let itinerary = $state<ItineraryResponse | null>(null);
  let steps = $state<Step[]>([]);
  let theme = $state<Theme | null>(null);
  let error = $state('');
  async function refresh() {
    const data = demoStorage.getItinerary();
    if (!data) return;
    theme = await loadTheme(data.theme_id);
    itinerary = { ...data, is_password_protected:false, is_shared_snapshot:false };
    steps = demoStorage.getSteps();
  }
  onMount(() => {
    setDemoMode(true);
    try {
      const existing = demoStorage.getData();
      if (existing?.itinerary.id !== 'comparison-demo') demoStorage.initializeDemo(getDemoData());
      void refresh().catch(() => error = 'デモを読み込めませんでした。再読み込みしてください。');
    } catch { error = 'デモの保存にはブラウザのストレージを有効にしてください。'; }
    return resetDemoMode;
  });
  async function reset() {
    if (!confirm('デモの変更を消して、最初の候補に戻しますか？')) return;
    demoStorage.initializeDemo(getDemoData());
    await refresh();
  }
</script>
<svelte:head><title>プラン比較を試す | たびたび</title><meta name="robots" content="noindex" /></svelte:head>
<div class="demo-banner">プラン比較のサンプル · 変更はこのブラウザのセッション内に保存 <button onclick={reset}>最初に戻す</button><a href="/#create">しおりを作る ↗</a></div>
{#if error}<p role="alert">{error}</p>{/if}
{#if itinerary && theme}
  {@const View = theme.components.ItineraryView}
  {#key itinerary.theme_id}
    <View {itinerary} {steps}
      onUpdateItinerary={async (data: Partial<ItineraryResponse>) => { demoStorage.updateItinerary(data); await refresh(); }}
      onCreateStep={async (data: Omit<Step,'id'|'created_at'|'updated_at'|'itinerary_id'>) => { const created = demoStorage.createStep({...data,itinerary_id:'comparison-demo'}); await refresh(); return created; }}
      onUpdateStep={async (id: string, data: Partial<Step>) => { demoStorage.updateStep(id,data); await refresh(); }}
      onDeleteStep={async (id: string) => { demoStorage.deleteStep(id); await refresh(); }} />
  {/key}
{/if}
<style>
  .demo-banner { display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:12px; padding:10px 16px; background:#e9eee4; color:#53634f; font-size:11px; }
  button,a { border:0; background:none; color:#35695d; font:inherit; text-decoration:underline; cursor:pointer; }
</style>
