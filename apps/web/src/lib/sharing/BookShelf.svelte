<script lang="ts">
  import type { UserBookmarkWithItinerary } from '@tabitabi/types';
  import { getPalette } from '$lib/themes';
  import { userApi, type BookContent } from '$lib/api/user';
  import { itineraryApi } from '$lib/api/itinerary';
  import { stepApi } from '$lib/api/step';
  import Dialog from '$lib/themes/standard/core/components/Dialog.svelte';
  import PublishDialog from '$lib/themes/standard/core/components/PublishDialog.svelte';
  import { prefectureName } from '$lib/explore/data';
  import AppIcon from '$lib/icons/AppIcon.svelte';
  let { bookmarks, onRefresh, onUnlink, focusShared = 0 }: { bookmarks: UserBookmarkWithItinerary[]; onRefresh: () => Promise<void>; onUnlink: (item: UserBookmarkWithItinerary) => void; focusShared?: number } = $props();
  let shared = $state(false);
  let target = $state<UserBookmarkWithItinerary | null>(null);
  let managing = $state(false);
  let direction = $state<'update' | 'restore' | 'stop' | null>(null);
  let source = $state<BookContent | null>(null);
  let snapshot = $state<BookContent | null>(null);
  let busy = $state(false);
  let message = $state('');
  let publishingTarget = $state<UserBookmarkWithItinerary | null>(null);
  const coverImages: Record<string, string> = {
    daycard: '/hero/background-spring.avif',
    list: '/hero/background-summer.avif',
    week: '/hero/background-autumn.avif',
    month: '/hero/background-winter.avif',
    'map-only': '/itinerary-backgrounds/coastal-drive.avif',
    'mapbox-journey': '/itinerary-backgrounds/sky.avif',
    shopping: '/itinerary-backgrounds/food.webp',
    'planning-draft': '/itinerary-backgrounds/japanese.avif',
    'planning-map': '/itinerary-backgrounds/coastal-drive.avif',
  };
  const publications = $derived(bookmarks.filter(item => item.is_visible && item.shared_itinerary_id));
  const books = $derived(shared ? publications : bookmarks);
  const from = $derived(direction === 'restore' ? snapshot : source);
  const to = $derived(direction === 'restore' ? source : snapshot);
  $effect(() => {
    if (focusShared > 0) shared = true;
  });
  function date(value?: number | null) { return value == null ? '日程未定' : new Date(value).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }); }
  function days(item: UserBookmarkWithItinerary) {
    if (item.start_at == null || item.end_at == null) return '';
    const start = new Date(item.start_at); const end = new Date(item.end_at);
    return `${Math.round((Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) - Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / 86400000) + 1}日間`;
  }
  function dateRange(item: UserBookmarkWithItinerary) {
    if (item.start_at == null) return '日程未定';
    const start = new Date(item.start_at);
    const startText = `${start.getMonth() + 1}/${start.getDate()}`;
    if (item.end_at == null) return startText;
    const end = new Date(item.end_at);
    return `${startText} – ${end.getMonth() + 1}/${end.getDate()}`;
  }
  function destination(item: UserBookmarkWithItinerary) {
    if (item.areas?.length) return item.areas[0];
    if (item.prefecture_slugs?.length) return prefectureName(item.prefecture_slugs[0]);
    return '旅のしおり';
  }
  function cover(item: UserBookmarkWithItinerary) {
    return item.background_image ?? coverImages[item.theme_id] ?? '/itinerary-backgrounds/japanese.avif';
  }
  function open(item: UserBookmarkWithItinerary, manage = false) { target = item; managing = manage; direction = null; message = ''; source = snapshot = null; }
  async function copy() {
    try { await navigator.clipboard.writeText(`${window.location.origin}/s/${target!.shared_itinerary_id}`); message = 'リンクをコピーしました'; }
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
  function startPublication(item: UserBookmarkWithItinerary) {
    target = null;
    publishingTarget = item;
  }
  async function closePublication() {
    publishingTarget = null;
    await onRefresh();
  }
</script>

<nav class="shelf-tabs" aria-label="しおりの種類">
  <button class:active={!shared} aria-pressed={!shared} onclick={() => shared = false}>
    <span>自分のしおり</span><small>{bookmarks.length}</small>
  </button>
  <button class:active={shared} aria-pressed={shared} onclick={() => shared = true}>
    <span>共有中</span><small>{publications.length}</small>
  </button>
</nav>

{#if !books.length}
  <div class="empty">
    <span aria-hidden="true">{#if shared}<AppIcon name="share" size={23} />{:else}<AppIcon name="plus" size={23} />{/if}</span>
    <p>{shared ? '共有中のしおりはありません' : '最初の旅を、この本棚に。'}</p>
    <a href="/#create">しおりを作る</a>
  </div>
{:else}
  <div class="shelf">
    {#each books as book (book.itinerary_id)}
      <article class:stacked={shared}>
        {#if shared}
          <button class="book-card shared-card" onclick={() => open(book, true)} aria-label="{book.shared_title ?? book.title}の共有設定を開く">
            <span class="visual">
              <img src={cover(book)} alt="" loading="lazy" decoding="async" width="640" height="360" />
              <span class="shared-badge">共有中</span>
              <span class="more" aria-hidden="true"><AppIcon name="more-horizontal" size={20} /></span>
            </span>
            <span class="book-body">
              <span class="destination">{destination(book)} / {days(book) || "日程未定"}</span>
              <strong>{book.shared_title ?? book.title}</strong>
              <span class="book-meta"><span>{dateRange(book)}</span><small>共有版を管理</small></span>
            </span>
          </button>
        {:else}
          <a class="book-card" href="/itineraries/{book.itinerary_id}" aria-label="{book.title}を開く">
            <span class="visual">
              <img src={cover(book)} alt="" loading="lazy" decoding="async" width="640" height="360" />
              {#if book.is_visible}<span class="shared-badge">共有中</span>{/if}
            </span>
            <span class="book-body">
              <span class="destination">{destination(book)} / {days(book) || "日程未定"}</span>
              <strong>{book.title}</strong>
              <span class="book-meta"><span>{dateRange(book)}</span><small>{days(book)}</small></span>
            </span>
          </a>
          <button class="menu" aria-label="{book.title}のメニュー" onclick={() => open(book)}><AppIcon name="more-horizontal" size={20} /></button>
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
      <a class="sheet-action primary" href="/s/{target.shared_itinerary_id}">{managing ? '共有版を見る' : '共有を見る'}</a>
      {#if managing}
        <hr />
        <a class="sheet-action" href="/itineraries/{target.itinerary_id}">元のしおりを編集</a>
        <button class="sheet-action" onclick={() => compare('update')} disabled={busy}>元のしおりから更新</button>
        <button class="sheet-action" onclick={() => compare('restore')} disabled={busy}>元のしおりへ反映</button>
      {/if}
      <button class="sheet-action" onclick={copy}>リンクをコピー</button>
      {#if managing}<button class="sheet-action danger" onclick={() => direction = 'stop'} disabled={busy}>共有をやめる</button>
      {:else}<button class="sheet-action" onclick={() => managing = true}>共有版を管理</button>{/if}
    {:else if target}
      <button class="sheet-action primary" onclick={() => startPublication(target!)}>共有版を作る</button>
      <button class="sheet-action" onclick={() => { onUnlink(target!); target = null; }}>紐付けを解除</button>
    {/if}
  {/snippet}
</Dialog>

{#if publishingTarget}
  <PublishDialog
    show
    itineraryId={publishingTarget.itinerary_id}
    isLoggedIn={true}
    sourceText={publishingTarget.title}
    initialMetadata={{ prefectureSlugs: publishingTarget.prefecture_slugs ?? [], areas: publishingTarget.areas ?? [], tags: publishingTarget.tags ?? [] }}
    onLogin={() => {}}
    onPublish={async (metadata) => (await userApi.publishBookmark(publishingTarget!.itinerary_id, { prefecture_slugs: metadata.prefectureSlugs, areas: metadata.areas, tags: metadata.tags })).id}
    onClose={closePublication}
  />
{/if}

<style>
  .shelf-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin: 0 0 1.15rem;
    padding: .28rem;
    border-radius: 1rem;
    background: #f3f2ed;
  }

  .shelf-tabs button {
    display: flex;
    min-height: 2.85rem;
    padding: .55rem .8rem;
    border: 0;
    border-radius: .8rem;
    align-items: center;
    justify-content: center;
    gap: .35rem;
    color: #85909b;
    background: transparent;
    font: inherit;
    font-size: .78rem;
    font-weight: 800;
    cursor: pointer;
  }

  .shelf-tabs button.active {
    color: #18334a;
    background: white;
    box-shadow: 0 5px 18px rgba(38, 57, 72, .07);
  }

  .shelf-tabs small {
    font-size: .67rem;
    font-weight: 700;
  }

  .shelf {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
    padding-bottom: 2rem;
  }

  article {
    position: relative;
    min-width: 0;
    overflow: hidden;
    border: 1px solid #e2e8ec;
    border-radius: 1rem;
    background: white;
    box-shadow: 0 8px 24px rgba(36, 58, 74, .055);
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  article:hover {
    transform: translateY(-2px);
    box-shadow: 0 13px 30px rgba(36, 58, 74, .09);
  }

  article.stacked {
    border-color: #d8e3e9;
  }

  .book-card {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    color: inherit;
    background: white;
    font: inherit;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }

  .visual {
    position: relative;
    display: block;
    aspect-ratio: 16 / 8.7;
    overflow: hidden;
    background: #eef5f7;
  }

  .visual::after {
    content: "";
    position: absolute;
    inset: auto 0 0;
    height: 34%;
    background: linear-gradient(180deg, transparent, rgba(14, 43, 59, .14));
    pointer-events: none;
  }

  .visual img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 220ms ease;
  }

  article:hover .visual img {
    transform: scale(1.025);
  }

  .shared-badge {
    position: absolute;
    z-index: 2;
    left: .65rem;
    top: .65rem;
    padding: .3rem .48rem;
    border-radius: 999px;
    color: #285e77;
    background: rgba(255,255,255,.9);
    box-shadow: 0 3px 12px rgba(28, 56, 73, .09);
    font-size: .58rem;
    font-weight: 900;
  }

  .more {
    position: absolute;
    z-index: 2;
    right: .6rem;
    top: .48rem;
    display: grid;
    width: 2rem;
    height: 2rem;
    place-items: center;
    border-radius: 50%;
    color: #385468;
    background: rgba(255,255,255,.9);
    box-shadow: 0 3px 12px rgba(28, 56, 73, .09);
    font-size: 1rem;
  }

  .book-body {
    display: grid;
    min-height: 9rem;
    padding: .85rem .9rem .9rem;
  }

  .destination {
    overflow: hidden;
    color: #7d8b97;
    font-size: .62rem;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .book-body strong {
    display: -webkit-box;
    min-height: 3.2rem;
    margin: .5rem 0 .7rem;
    overflow: hidden;
    color: #1d3348;
    font-family: var(--home-font-serif, Georgia, serif);
    font-size: clamp(.95rem, 2.5vw, 1.18rem);
    font-weight: 500;
    line-height: 1.55;
    letter-spacing: .035em;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .book-meta {
    display: flex;
    margin-top: auto;
    padding-top: .62rem;
    border-top: 1px solid #edf0f2;
    align-items: flex-end;
    justify-content: space-between;
    gap: .6rem;
    color: #4d6173;
    font-family: var(--home-font-serif, Georgia, serif);
    font-size: .83rem;
  }

  .book-meta small {
    color: #83909d;
    font-family: var(--home-font-sans, sans-serif);
    font-size: .58rem;
    font-weight: 600;
  }

  .menu {
    position: absolute;
    z-index: 3;
    right: .55rem;
    top: .45rem;
    display: grid;
    width: 2rem;
    height: 2rem;
    padding: 0;
    place-items: center;
    border: 0;
    border-radius: 50%;
    color: #385468;
    background: rgba(255,255,255,.92);
    box-shadow: 0 3px 12px rgba(28, 56, 73, .09);
    font-size: 1rem;
    cursor: pointer;
  }

  .menu:focus-visible,
  .book-card:focus-visible,
  .shelf-tabs button:focus-visible {
    outline: 2px solid #28799a;
    outline-offset: 2px;
  }

  .empty {
    display: grid;
    min-height: 13rem;
    padding: 2rem 1rem;
    border: 1px dashed #cbdce5;
    border-radius: 1.1rem;
    place-items: center;
    align-content: center;
    gap: .65rem;
    color: #71808c;
    background: rgba(255,255,255,.68);
    text-align: center;
  }

  .empty > span {
    color: #4e8aa6;
    font-size: 1.5rem;
  }

  .empty p {
    margin: 0;
    font-family: var(--home-font-serif, Georgia, serif);
  }

  .empty a {
    display: inline-flex;
    min-height: 2.6rem;
    padding: 0 1rem;
    border-radius: 999px;
    align-items: center;
    color: white;
    background: #28799a;
    font-size: .75rem;
    font-weight: 800;
    text-decoration: none;
  }

  .sheet-action {
    display: block;
    width: 100%;
    padding: .9rem;
    border: 0;
    background: transparent;
    color: #355447;
    text-decoration: none;
    text-align: left;
    font: inherit;
    cursor: pointer;
  }

  .sheet-action.primary {
    border-radius: .5rem;
    color: white;
    background: #2b7796;
    text-align: center;
  }

  .sheet-action.danger {
    color: #a7534e;
  }

  .hint {
    color: #7e857c;
    font-size: .8rem;
    line-height: 1.7;
  }

  hr {
    margin: 1rem 0;
    border: 0;
    border-top: 1px solid #e6e5df;
  }

  .comparison {
    display: grid;
    margin: 1.5rem 0;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: .8rem;
  }

  .comparison div {
    min-height: 130px;
    padding: 1rem;
    border: 1px solid #dedcd2;
    background: #faf7ed;
  }

  .comparison strong {
    display: block;
    margin-top: 1rem;
    overflow-wrap: anywhere;
    font-family: serif;
  }

  dl {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: .7rem;
    font-size: .8rem;
  }

  dd {
    margin: 0;
    text-align: right;
  }

  @media (min-width: 760px) {
    .shelf {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1.15rem;
    }

    .book-body {
      min-height: 10.5rem;
      padding: 1rem;
    }
  }

  @media (max-width: 430px) {
    .shelf {
      gap: .7rem;
    }

    article {
      border-radius: .75rem;
    }

    .book-body {
      min-height: 8.2rem;
      padding: .7rem;
    }

    .book-body strong {
      min-height: 2.9rem;
      margin: .4rem 0 .55rem;
      font-size: .9rem;
    }

    .destination {
      font-size: .56rem;
    }

    .book-meta {
      font-size: .72rem;
    }

    .book-meta small {
      font-size: .52rem;
    }

    .shared-badge {
      left: .45rem;
      top: .45rem;
    }

    .menu,
    .more {
      right: .38rem;
      top: .32rem;
      width: 1.8rem;
      height: 1.8rem;
    }
  }
</style>