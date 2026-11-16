<script lang="ts">
  import { onMount } from 'svelte';
  import type { ItineraryResponse, Step, Theme } from '@tabitabi/types';
  import { loadTheme } from '$lib/themes';
  import { itineraryApi } from '$lib/api/itinerary';
  import { userApi, type BookContent } from '$lib/api/user';
  import { planGraphApi } from '$lib/api/plan-graph';
  import type { PlanGraph } from '@tabitabi/types';
  import { auth } from '$lib/auth';

  let { content, preview = false, onBack, onConfirm }: {
    content: BookContent; preview?: boolean; onBack?: () => void; onConfirm?: (content: BookContent) => Promise<true | string>;
  } = $props();
  // `content` can be a Svelte reactive proxy when opened from the publish dialog.
  // Snapshot it before making the editable local copy.
  let itinerary = $state<ItineraryResponse>($state.snapshot(content.itinerary));
  let planGraph = $state<PlanGraph | null>(content.planGraph ? $state.snapshot(content.planGraph) : null);
  let graphReady = $state(false);
  let graphLoadError = $state(false);
  async function loadGraph() {
    graphLoadError = false;
    try {
      planGraph = content.planGraph ? $state.snapshot(content.planGraph) : await planGraphApi.get(content.itinerary.id);
      graphReady = true;
    } catch { graphLoadError = true; }
  }
  const currentContent = () => {
    const ids = new Set(steps.map(step => step.id));
    return { itinerary, steps, ...(planGraph ? { planGraph: { ...planGraph,
      nodes: planGraph.nodes.filter(node => ids.has(node.id)),
      edges: planGraph.edges.filter(edge => ids.has(edge.from) && ids.has(edge.to)),
    } } : {}) };
  };
  let steps = $state<Step[]>($state.snapshot(content.steps));
  let theme = $state<Theme | null>(null);
  let planningPreview = $state(preview);
  const viewThemeId = $derived(planningPreview ? 'planning-draft' : itinerary.theme_id);
  let edited = $state(false);
  let notice = $state('');
  let busy = $state(false);
  let ownerSource = $state<string | null>(null);
  let editingPublication = $state(false);
  let timer: ReturnType<typeof setTimeout>;
  $effect(() => {
    let current = true;
    loadTheme(viewThemeId).then(value => { if (current) theme = value; });
    return () => { current = false; };
  });
  onMount(() => {
    void loadGraph();
    if (!preview && new URLSearchParams(window.location.search).get('manage') === '1') {
      userApi.getMyBookmarks().then(({ bookmarks }) => {
        ownerSource = bookmarks.find(item => item.shared_itinerary_id === content.itinerary.id)?.itinerary_id ?? null;
        editingPublication = !!ownerSource;
      }).catch(() => { notice = '共有版の編集には公開したアカウントでログインしてください'; });
    }
    return () => clearTimeout(timer);
  });
  function changed() {
    if (!edited && !preview && !editingPublication) {
      notice = 'この変更はあなただけに表示されます';
      timer = setTimeout(() => notice = '', 4000);
    }
    edited = true;
  }
  async function updateItinerary(update: Partial<ItineraryResponse>) { if (update.theme_id) planningPreview = false; itinerary = { ...itinerary, ...update }; changed(); }
  async function createStep(input: Partial<Step>) {
    const now = new Date().toISOString();
    const created: Step = { id: crypto.randomUUID(), itinerary_id: itinerary.id, title: '', start_at: 0, end_at: 0,
      location: null, notes: '', link: null, type: 'normal:general', is_all_day: false, created_at: now, updated_at: now, ...input };
    steps = [...steps, created];
    changed();
    return created;
  }
  async function updateStep(id: string, update: Partial<Step>) { steps = steps.map(step => step.id === id ? { ...step, ...update } : step); changed(); }
  async function deleteStep(id: string) { steps = steps.filter(step => step.id !== id); changed(); }
  async function act() {
    if (busy) return;
    busy = true;
    try {
      if (preview) {
        const published = await onConfirm?.(currentContent());
        if (typeof published === 'string') {
          notice = published;
          clearTimeout(timer);
          timer = setTimeout(() => notice = '', 5000);
        }
        return;
      }
      if (editingPublication && ownerSource) {
        await userApi.savePublication(ownerSource, currentContent());
        notice = '共有版を保存しました'; edited = false;
      } else {
        const result = await itineraryApi.fork(content.itinerary.id, currentContent());
        auth.setToken(result.id, result.title, result.token);
        window.location.assign(`/itineraries/${result.id}?copied=1`);
      }
    } catch { notice = '保存できませんでした。もう一度お試しください'; }
    finally { busy = false; }
  }
</script>

<div class:preview class="shared-book">
  <header>
    {#if preview}
      <button class="preview-back" onclick={onBack} aria-label="公開情報に戻る">←</button>
      <span>プレビュー</span>
      <details><summary>共有される情報について ⓘ</summary><p>ここに表示される内容が共有されます。共有版は元のしおりと自動同期しません。</p></details>
      <button type="button" class="publish" onclick={act} disabled={busy || !graphReady}>{busy ? '作成中…' : '共有版を作成'}</button>
    {:else}
      <div class="header-left">
        <a class="brand" href="/" aria-label="たびたび ホーム">tabitabi</a>
        <span class="divider" aria-hidden="true"></span>
        <a class="explore-link" href="/explore" aria-label="みんなのしおり一覧に戻る">
          <span aria-hidden="true">←</span>
          <span>みんなのしおり</span>
        </a>
        {#if editingPublication}<span class="page-state">共有版を編集</span>{/if}
      </div>
      <nav class="header-actions" aria-label="共有されたしおりの操作">
        {#if !editingPublication}
          <button class="copy" onclick={act} disabled={busy || !graphReady}>{busy ? '保存中…' : 'コピー'}</button>
        {/if}
      </nav>
    {/if}
  </header>
  {#if graphReady}
    <nav class="preview-view" aria-label="プレビューの表示">
      <button aria-pressed={planningPreview || itinerary.theme_id === 'planning-draft'} onclick={() => planningPreview = true}>予定表で編集</button>
      {#if itinerary.theme_id !== 'planning-draft'}<button aria-pressed={!planningPreview} onclick={() => planningPreview = false}>元のテーマで表示</button>{/if}
      <span>編集内容はコピー・共有版の保存時に反映されます</span>
    </nav>
  {/if}
  {#if notice}<div class="notice" role="status">{notice}</div>{/if}
  {#if graphLoadError}<p role="alert">プランを読み込めませんでした。<button onclick={loadGraph}>再読込</button></p>{/if}
  {#if theme && graphReady}
    {@const View = theme.components.ItineraryView}
    {#key viewThemeId}
      <View {itinerary} {steps} localPlanning={true} {planGraph} onSavePlanGraph={(graph: PlanGraph) => { planGraph = graph; changed(); }} onUpdateItinerary={updateItinerary} onCreateStep={createStep} onUpdateStep={updateStep} onDeleteStep={deleteStep} />
    {/key}
  {:else}<p class="loading">しおりを開いています…</p>{/if}
</div>

<style>
  .preview-view{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:10px 16px;background:#f4f7f4;color:#748078;font-size:11px}.preview-view button{padding:7px 12px;border:1px solid #d8e1db;border-radius:999px;background:white;color:#306653;font:inherit;cursor:pointer}.preview-view button[aria-pressed="true"]{background:#306653;color:white}.preview-view span{margin-left:auto}@media(max-width:600px){.preview-view span{width:100%;margin:0}}

  .shared-book > header { position: relative; z-index: 90; display: flex; align-items: center; gap: 1rem; min-height: 42px; padding: .4rem 1rem; background: #faf9f5; border-bottom: 1px solid #e2dfd5; color: #686d63; font-size: .75rem; }
  .shared-book > header > span { min-width: 0; }
  header button { border: 0; padding: .5rem; background: transparent; font-size: 1rem; }
  .header-left { display: flex; min-width: 0; align-items: center; gap: .55rem; }
  .brand { flex: 0 0 auto; color: #243b63; font-size: .9rem; font-weight: 900; letter-spacing: .04em; text-decoration: none; }
  .brand:hover { color: #315da8; }
  .divider { width: 1px; height: 18px; flex: 0 0 auto; background: #d5d8d0; }
  .explore-link { display: inline-flex; min-width: 0; align-items: center; gap: .3rem; padding: .42rem .5rem; border-radius: .45rem; color: #355f50; font-weight: 700; text-decoration: none; white-space: nowrap; }
  .explore-link:hover { background: #eef2ef; }
  .page-state { overflow: hidden; color: #83877f; text-overflow: ellipsis; white-space: nowrap; }
  .header-actions { display: flex; align-items: center; gap: .5rem; margin-left: auto; }
  .header-actions .copy { padding: .45rem .65rem; border: 1px solid #355f50; border-radius: 99px; color: #fff; background: #355f50; font: inherit; font-size: .75rem; white-space: nowrap; cursor: pointer; }
  .header-actions .copy:disabled { cursor: wait; opacity: .7; }
  .publish { margin-left: .25rem; border: 0; border-radius: 99px; padding: .5rem .75rem; color: white; background: #355f50; font: inherit; font-size: .72rem; font-weight: 700; white-space: nowrap; cursor: pointer; }
  .publish:disabled { cursor: wait; opacity: .7; }
  @media (max-width: 540px) {
    .shared-book > header { gap: .4rem; padding: .4rem .65rem; }
    .preview > header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; }
    .preview > header > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .preview > header .publish { grid-column: 1 / -1; width: 100%; margin: .1rem 0 0; padding: .62rem .75rem; }
    .header-left { gap: .35rem; }
    .brand { font-size: .82rem; }
    .divider { height: 16px; }
    .explore-link { padding: .4rem .35rem; font-size: .68rem; }
    .page-state { display: none; }
    .header-actions { gap: .3rem; }
    .header-actions .copy { padding: .4rem .55rem; font-size: .68rem; }
  }
  details { margin-left: auto; } details p { position: absolute; top: calc(100% + .3rem); right: 1rem; max-width: 260px; padding: 1rem; background: white; border: 1px solid #ddd; }
  .preview { position: fixed; inset: 0; z-index: 2000; overflow: auto; background: #faf9f5; }
  .preview > header { position: sticky; top: 0; }
  .notice { position: fixed; z-index: 3000; top: 3.5rem; left: 50%; transform: translateX(-50%); width: max-content; max-width: 90%; padding: .8rem 1rem; border-radius: .5rem; color: #fff; background: #355f50; font-size: .8rem; }
  .loading { padding: 3rem; text-align: center; }
</style>
