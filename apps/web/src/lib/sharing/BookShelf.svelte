<script lang="ts">
  import type { UserBookmarkWithItinerary } from '@tabitabi/types';
  import { getPalette } from '$lib/themes';
  import { userApi, type BookContent } from '$lib/api/user';
  import { itineraryApi } from '$lib/api/itinerary';
  import { stepApi } from '$lib/api/step';
  import Dialog from '$lib/themes/standard/core/components/Dialog.svelte';
  let { bookmarks, onRefresh, onUnlink }: { bookmarks: UserBookmarkWithItinerary[]; onRefresh: () => Promise<void>; onUnlink: (item: UserBookmarkWithItinerary) => void } = $props();
  let shared = $state(false);
  let target = $state<UserBookmarkWithItinerary | null>(null);
  let managing = $state(false);
  let direction = $state<'update' | 'restore' | 'stop' | null>(null);
  let source = $state<BookContent | null>(null);
  let snapshot = $state<BookContent | null>(null);
  let busy = $state(false);
  let message = $state('');
  const publications = $derived(bookmarks.filter(item => item.is_visible && item.shared_itinerary_id));
  const books = $derived(shared ? publications : bookmarks);
  const from = $derived(direction === 'restore' ? snapshot : source);
  const to = $derived(direction === 'restore' ? source : snapshot);
  function date(value?: number | null) { return value == null ? '日程未定' : new Date(value).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }); }
  function days(item: UserBookmarkWithItinerary) {
    if (item.start_at == null || item.end_at == null) return '';
    const start = new Date(item.start_at); const end = new Date(item.end_at);
    return `${Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000) + 1}日間`;
  }
  function open(item: UserBookmarkWithItinerary, manage = false) { target = item; managing = manage; direction = null; message = ''; source = snapshot = null; }
  async function copy() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/itineraries/${target!.shared_itinerary_id}`); message = 'リンクをコピーしました'; }
    catch { message = 'リンクをコピーできませんでした'; }
  }
  async function compare(next: 'update' | 'restore') {
    if (!target || busy) return;
    busy = true; message = '';
    try {
      const [original, book, steps] = await Promise.all([userApi.previewPublication(target.itinerary_id), itineraryApi.get(target.shared_itinerary_id!), stepApi.list(target.shared_itinerary_id!)]);
      source = original; snapshot = { itinerary: book, steps }; direction = next;
    } catch { message = '内容を読み込めませんでした。元のしおりを開いて認証後、もう一度お試しください'; }
    finally { busy = false; }
  }
  async function confirm() {
    if (!target || busy) return;
    busy = true;
    try {
      if (direction === 'stop') await userApi.unpublishBookmark(target.itinerary_id);
      else if (direction === 'restore') await userApi.restorePublication(target.itinerary_id);
      else await userApi.publishBookmark(target.itinerary_id, { prefecture_slugs: snapshot?.itinerary.prefecture_slugs ?? target.prefecture_slugs, areas: snapshot?.itinerary.areas ?? target.areas, tags: snapshot?.itinerary.tags ?? target.tags });
      await onRefresh(); target = null;
    } catch { message = '変更できませんでした。もう一度お試しください'; }
    finally { busy = false; }
  }
</script>

<nav class="shelf-tabs" aria-label="しおりの種類">
  <button class:active={!shared} aria-pressed={!shared} onclick={() => shared = false}>自分のしおり <small>{bookmarks.length}</small></button>
  <button class:active={shared} aria-pressed={shared} onclick={() => shared = true}>共有中 <small>{publications.length}</small></button>
</nav>
{#if !books.length}
  <div class="empty"><p>{shared ? '共有中のしおりはありません' : '最初の旅を、この本棚に。'}</p><a href="/#create">＋ しおりを作る</a></div>
{:else}
  <div class="shelf">
    {#each books as book (book.itinerary_id)}
      {@const palette = getPalette(book.palette_id)}
      <article class:stacked={shared} style={`--paper:${palette.colors['--theme-bg']};--ink:${palette.colors['--theme-primary']}`}>
        {#if shared}
          <button class="cover" onclick={() => open(book, true)}><span class="stamp">共有版</span><strong>{book.shared_title ?? book.title}</strong><span class="dates">{date(book.start_at)}<small>{days(book)}</small></span></button>
        {:else}
          <a class="cover" href="/itineraries/{book.itinerary_id}"><span class="edition">TABITABI / 旅のしおり</span><strong>{book.title}</strong><span class="dates">{date(book.start_at)}<small>{days(book)}</small></span></a>
          {#if book.is_visible}<button class="shared-mark" title="共有中" aria-label="共有中" onclick={() => open(book)}>◉</button>{/if}
          <button class="menu" aria-label={`${book.title}のメニュー`} onclick={() => open(book)}>…</button>
        {/if}
      </article>
    {/each}
  </div>
{/if}

<Dialog show={!!target} title={direction === 'update' ? '共有版を更新' : direction === 'restore' ? '元のしおりへ反映' : direction === 'stop' ? '共有をやめる' : (target?.shared_title ?? target?.title ?? '')} onClose={() => { if (!busy) target = null; }}>
  {#snippet children()}
    {#if message}<p role="status">{message}</p>{/if}
    {#if direction === 'stop'}
      <p>共有URLからこのしおりを開けなくなります。元のしおりは残ります。</p>
      <button class="sheet-action danger" onclick={confirm} disabled={busy}>共有をやめる</button>
    {:else if direction && from && to}
      <div class="comparison"><div><small>{direction === 'restore' ? '共有版' : '元しおり'}</small><strong>{from.itinerary.title}</strong></div><span aria-label="上書き先">→</span><div><small>{direction === 'restore' ? '元しおり' : '共有版'}</small><strong>{to.itinerary.title}</strong></div></div>
      <dl><dt>予定</dt><dd>{to.steps.length} → {from.steps.length}件</dd><dt>テーマ・色</dt><dd>{from.itinerary.theme_id !== to.itinerary.theme_id || from.itinerary.palette_id !== to.itinerary.palette_id ? '変更あり' : '変更なし'}</dd><dt>最終更新</dt><dd>{new Date(to.itinerary.updated_at).toLocaleDateString('ja-JP')}</dd></dl>
      <p class="hint">矢印の先のタイトル・予定・メモ・デザインを置き換えます。自動同期はしません。</p>
      <button class="sheet-action primary" onclick={confirm} disabled={busy}>{busy ? '更新中…' : direction === 'restore' ? '元のしおりへ反映' : '共有版を更新'}</button>
      <button class="sheet-action" onclick={() => direction = null} disabled={busy}>戻る</button>
    {:else if target?.is_visible}
      {#if managing}<p class="hint">現在共有されている内容</p>{/if}
      <a class="sheet-action primary" href="/itineraries/{target.shared_itinerary_id}">{managing ? '共有版を見る' : '共有を見る'}</a>
      {#if managing}
        <hr />
        <a class="sheet-action" href="/itineraries/{target.shared_itinerary_id}?manage=1">共有版を編集</a>
        <button class="sheet-action" onclick={() => compare('update')} disabled={busy}>元のしおりから更新</button>
        <button class="sheet-action" onclick={() => compare('restore')} disabled={busy}>元のしおりへ反映</button>
      {/if}
      <button class="sheet-action" onclick={copy}>リンクをコピー</button>
      {#if managing}<button class="sheet-action danger" onclick={() => direction = 'stop'} disabled={busy}>共有をやめる</button>
      {:else}<button class="sheet-action" onclick={() => managing = true}>共有版を管理</button>{/if}
    {:else if target}
      <a class="sheet-action" href="/itineraries/{target.itinerary_id}?publish=1">共有版を作る</a>
      <button class="sheet-action" onclick={() => { onUnlink(target!); target = null; }}>紐付けを解除</button>
    {/if}
  {/snippet}
</Dialog>

<style>
  .shelf-tabs { display: flex; gap: 1.5rem; margin: 1.5rem 0 2rem; } .shelf-tabs button { padding: .7rem 0; border: 0; border-bottom: 2px solid transparent; color: #899087; background: none; font: inherit; cursor: pointer; } .shelf-tabs button.active { color: #355f50; border-color: #355f50; } small { font-size: .7rem; font-weight: 400; }
  .shelf { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 1.5rem 1rem; padding: 0 .3rem 2rem; }
  article { position: relative; isolation: isolate; min-width: 0; color: var(--ink,#355f50); background: var(--paper,#faf7ed); border: 1px solid color-mix(in srgb,var(--ink,#355f50) 22%,white); border-radius: 3px 8px 8px 3px; box-shadow: 3px 4px 0 #eceae2, 4px 5px 0 #dddcd2; }
  article::before { content: ''; position: absolute; inset: 0 auto 0 8px; border-left: 1px solid currentColor; opacity: .15; pointer-events: none; }
  article.stacked::after { content: ''; position: absolute; z-index: -1; inset: -6px -6px 6px 6px; border: 1px solid #d4d8cf; background: var(--paper,#faf7ed); border-radius: 3px; }
  .cover { display: flex; flex-direction: column; width: 100%; min-height: 235px; height: 100%; padding: 1.1rem 1rem 1.3rem 1.3rem; border: 0; color: inherit; background: transparent; text-decoration: none; text-align: left; cursor: pointer; }
  .cover strong { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; margin: 2rem 0 1.5rem; font-family: 'Yu Mincho',serif; font-size: clamp(1.2rem,3vw,1.8rem); line-height: 1.65; letter-spacing: .07em; overflow-wrap: anywhere; }
  .edition { font-size: .5rem; letter-spacing: .1em; opacity: .6; } .dates { margin-top: auto; padding-top: .7rem; border-top: 1px solid color-mix(in srgb,currentColor 25%,transparent); width: 100%; font-family: serif; font-size: 1.2rem; } .dates small { display: block; margin-top: .3rem; font-family: sans-serif; }
  .stamp { align-self: flex-start; padding: .2rem .4rem; border: 1px solid currentColor; font-size: .6rem; letter-spacing: .15em; } .shared-mark,.menu { position: absolute; right: .4rem; border: 0; color: inherit; background: transparent; width: 36px; height: 36px; cursor: pointer; } .shared-mark { top: .2rem; font-size: .7rem; } .menu { bottom: .3rem; font-size: 1.2rem; }
  .sheet-action { display: block; width: 100%; padding: .9rem; border: 0; background: transparent; color: #355447; text-decoration: none; text-align: left; font: inherit; cursor: pointer; } .primary { background: #355f50; color: white; border-radius: .5rem; text-align: center; } .danger { color: #a7534e; } .hint { font-size: .8rem; color: #7e857c; line-height: 1.7; } hr { border: 0; border-top: 1px solid #e6e5df; margin: 1rem 0; }
  .comparison { display: grid; grid-template-columns: 1fr auto 1fr; gap: .8rem; align-items: center; margin: 1.5rem 0; } .comparison div { padding: 1rem; min-height: 130px; background: #faf7ed; border: 1px solid #dedcd2; } .comparison strong { display: block; margin-top: 1rem; font-family: serif; overflow-wrap: anywhere; } dl { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; font-size: .8rem; } dd { margin: 0; text-align: right; } .empty { padding: 3rem 1rem; text-align: center; color: #758074; }
  @media(min-width:700px) { .shelf { grid-template-columns: repeat(3,minmax(0,1fr)); gap: 2rem; } .cover { min-height: 300px; padding: 1.5rem; } }
  @media(min-width:1100px) { .shelf { grid-template-columns: repeat(4,minmax(0,1fr)); } }
</style>
