<script lang="ts">
  import { onMount } from 'svelte';
  import type { ItineraryResponse, Step, Theme } from '@tabitabi/types';
  import { loadTheme } from '$lib/themes';
  import { itineraryApi } from '$lib/api/itinerary';
  import { userApi, type BookContent } from '$lib/api/user';
  import { auth } from '$lib/auth';

  let { content, preview = false, onBack, onConfirm }: {
    content: BookContent; preview?: boolean; onBack?: () => void; onConfirm?: (content: BookContent) => Promise<true | string>;
  } = $props();
  // `content` can be a Svelte reactive proxy when opened from the publish dialog.
  // Snapshot it before making the editable local copy.
  let itinerary = $state<ItineraryResponse>($state.snapshot(content.itinerary));
  let steps = $state<Step[]>($state.snapshot(content.steps));
  let theme = $state<Theme | null>(null);
  let edited = $state(false);
  let notice = $state('');
  let busy = $state(false);
  let ownerSource = $state<string | null>(null);
  let editingPublication = $state(false);
  let timer: ReturnType<typeof setTimeout>;
  $effect(() => {
    let current = true;
    loadTheme(itinerary.theme_id).then(value => { if (current) theme = value; });
    return () => { current = false; };
  });
  onMount(() => {
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
  async function updateItinerary(update: Partial<ItineraryResponse>) { itinerary = { ...itinerary, ...update }; changed(); }
  async function createStep(input: Partial<Step>) {
    const now = new Date().toISOString();
    steps = [...steps, { id: crypto.randomUUID(), itinerary_id: itinerary.id, title: '', start_at: 0, end_at: 0,
      location: null, notes: '{"text":""}', link: null, type: 'normal:general', is_all_day: false, created_at: now, updated_at: now, ...input }];
    changed();
  }
  async function updateStep(id: string, update: Partial<Step>) { steps = steps.map(step => step.id === id ? { ...step, ...update } : step); changed(); }
  async function deleteStep(id: string) { steps = steps.filter(step => step.id !== id); changed(); }
  async function act() {
    if (busy) return;
    busy = true;
    try {
      if (preview) {
        const published = await onConfirm?.({ itinerary, steps });
        if (typeof published === 'string') notice = published;
        return;
      }
      if (editingPublication && ownerSource) {
        await userApi.savePublication(ownerSource, { itinerary, steps });
        notice = '共有版を保存しました'; edited = false;
      } else {
        const result = await itineraryApi.fork(content.itinerary.id, { itinerary, steps });
        auth.setToken(result.id, result.title, result.token);
        window.location.assign(`/itineraries/${result.id}?copied=1`);
      }
    } catch { notice = '保存できませんでした。もう一度お試しください'; }
    finally { busy = false; }
  }
</script>

<div class:preview class="shared-book">
  <header>
    {#if preview}<button onclick={onBack} aria-label="公開情報に戻る">←</button>{/if}
    <span>{preview ? 'プレビュー' : editingPublication ? '共有版を編集' : '共有されたしおり'}</span>
    {#if preview}
      <details><summary>共有される情報について ⓘ</summary><p>ここに表示される内容が共有されます。共有版は元のしおりと自動同期しません。</p></details>
      <button type="button" class="publish" onclick={act} disabled={busy}>{busy ? '作成中…' : '共有版を作成'}</button>
    {/if}
    {#if !preview}
      <nav class="header-actions" aria-label="共有されたしおりの操作">
        <a href="/explore">共有されたしおり一覧に戻る</a>
        {#if !editingPublication}
          <button class="copy" onclick={act} disabled={busy}>{busy ? '保存中…' : 'コピー'}</button>
        {/if}
      </nav>
    {/if}
  </header>
  {#if notice}<div class="notice" role="status">{notice}</div>{/if}
  {#if theme}
    {@const View = theme.components.ItineraryView}
    {#key itinerary.theme_id}
      <View {itinerary} {steps} onUpdateItinerary={updateItinerary} onCreateStep={createStep} onUpdateStep={updateStep} onDeleteStep={deleteStep} />
    {/key}
  {:else}<p class="loading">しおりを開いています…</p>{/if}
</div>

<style>
  .shared-book > header { position: relative; z-index: 90; display: flex; align-items: center; gap: 1rem; min-height: 42px; padding: .4rem 1rem; background: #faf9f5; border-bottom: 1px solid #e2dfd5; color: #686d63; font-size: .75rem; }
  .shared-book > header > span { min-width: 0; }
  header button { border: 0; padding: .5rem; background: transparent; font-size: 1rem; }
  .header-actions { display: flex; align-items: center; gap: .5rem; margin-left: auto; }
  .header-actions a, .header-actions .copy { padding: .45rem .65rem; border: 1px solid #d5d8d0; border-radius: 99px; color: #355f50; background: #fff; font: inherit; font-size: .75rem; text-decoration: none; white-space: nowrap; cursor: pointer; }
  .header-actions .copy { border-color: #355f50; color: #fff; background: #355f50; }
  .header-actions .copy:disabled { cursor: wait; opacity: .7; }
  .publish { margin-left: .25rem; border: 0; border-radius: 99px; padding: .5rem .75rem; color: white; background: #355f50; font: inherit; font-size: .72rem; font-weight: 700; white-space: nowrap; cursor: pointer; }
  .publish:disabled { cursor: wait; opacity: .7; }
  @media (max-width: 540px) {
    .shared-book > header { gap: .4rem; padding: .4rem .65rem; }
    .preview > header { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; }
    .preview > header > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .preview > header .publish { grid-column: 1 / -1; width: 100%; margin: .1rem 0 0; padding: .62rem .75rem; }
    .header-actions { gap: .3rem; }
    .header-actions a, .header-actions .copy { padding: .4rem .5rem; font-size: .65rem; }
  }
  details { margin-left: auto; } details p { position: absolute; top: calc(100% + .3rem); right: 1rem; max-width: 260px; padding: 1rem; background: white; border: 1px solid #ddd; }
  .preview { position: fixed; inset: 0; z-index: 2000; overflow: auto; background: #faf9f5; }
  .preview > header { position: sticky; top: 0; }
  .notice { position: fixed; z-index: 3000; top: 3.5rem; left: 50%; transform: translateX(-50%); width: max-content; max-width: 90%; padding: .8rem 1rem; border-radius: .5rem; color: #fff; background: #355f50; font-size: .8rem; }
  .loading { padding: 3rem; text-align: center; }
</style>
