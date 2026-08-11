<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { userApi } from "$lib/api/user";
  import type { PublicFeedItem } from "@tabitabi/types";
  import ItineraryCard from "$lib/explore/ItineraryCard.svelte";
  import JapanMap from "$lib/explore/JapanMap.svelte";
  import PublicFooter from "$lib/explore/PublicFooter.svelte";
  import PublicHeader from "$lib/explore/PublicHeader.svelte";
  import {
    prefectures,
    regions,
    travelTags,
  } from "$lib/explore/data";

  let destination = $state("");
  let selectedTag = $state("");
  let itineraries = $state<PublicFeedItem[]>([]);
  let destinationCounts = $state<Record<string, number>>({});
  let loading = $state(true);
  let loadingMore = $state(false);
  let hasMore = $state(false);
  let loadError = $state("");

  const visibleItineraries = $derived(
    selectedTag
      ? itineraries.filter((itinerary) => itinerary.tags.includes(selectedTag))
      : itineraries,
  );
  const featuredDestinations = $derived(
    Object.entries(destinationCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([slug]) => slug),
  );

  onMount(loadFeed);

  async function loadFeed() {
    loading = true;
    loadError = "";
    try {
      const result = await userApi.getPublicFeed(0);
      itineraries = result.items;
      destinationCounts = result.destinationCounts;
      hasMore = result.hasMore;
    } catch {
      loadError = "公開しおりを読み込めませんでした。時間をおいて再度お試しください。";
    } finally {
      loading = false;
    }
  }

  async function loadMore() {
    loadingMore = true;
    try {
      const result = await userApi.getPublicFeed(itineraries.length);
      itineraries = [...itineraries, ...result.items];
      destinationCounts = result.destinationCounts;
      hasMore = result.hasMore;
    } catch {
      loadError = "追加のしおりを読み込めませんでした。";
    } finally {
      loadingMore = false;
    }
  }

  function search() {
    if (destination) void goto(`/area/${destination}${selectedTag ? `?tag=${encodeURIComponent(selectedTag)}` : ""}`);
  }
</script>

<svelte:head>
  <title>みんなのしおり - たびたび</title>
  <meta name="description" content="みんなが公開した旅行しおりを、行き先や旅のテーマから探せます。気になる旅程はコピーして、自分のしおりとして編集できます。" />
  <link rel="canonical" href="https://tabitabi.pages.dev/explore" />
  <meta property="og:title" content="みんなのしおり - たびたび" />
  <meta property="og:description" content="公開された旅程を見つけて、自分の旅のしおりにコピー。" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tabitabi.pages.dev/explore" />
  <meta property="og:image" content="https://tabitabi.pages.dev/og-explore.png" />
</svelte:head>

<div class="explore-page">
  <PublicHeader active="explore" />

  <main>
    <section class="hero">
      <div class="hero-inner">
        <p class="eyebrow">みんなのしおり</p>
        <h1>次の旅を、<br class="mobile-break" />実際の旅程から探そう。</h1>
        <p class="lead">気になるしおりを見つけたら、同じテーマのままコピーして、自分の旅に合わせて編集できます。</p>

        <form onsubmit={(event) => { event.preventDefault(); search(); }}>
          <label>
            <span>行き先</span>
            <select bind:value={destination} aria-label="都道府県を選ぶ">
              <option value="">都道府県を選ぶ</option>
              {#each prefectures as prefecture}<option value={prefecture.slug}>{prefecture.name}</option>{/each}
            </select>
          </label>
          <label>
            <span>旅のテーマ（任意）</span>
            <select bind:value={selectedTag} aria-label="旅のテーマを選ぶ">
              <option value="">指定しない</option>
              {#each travelTags as tag}<option value={tag}>{tag}</option>{/each}
            </select>
          </label>
          <button type="submit" disabled={!destination}>しおりを探す</button>
        </form>
      </div>
    </section>

    <section class="section map-section" aria-labelledby="map-title">
      <div class="section-heading">
        <div><p>DESTINATION</p><h2 id="map-title">行き先から探す</h2></div>
        <span>都道府県を選んだあと、エリアやテーマで絞れます。</span>
      </div>

      <div class="map-layout">
        <JapanMap counts={destinationCounts} />
        <aside class="popular">
          <h3>公開しおりが多い旅先</h3>
          {#if featuredDestinations.length === 0}
            <p class="popular-empty">公開されると、ここに旅先が表示されます。</p>
          {/if}
          {#each featuredDestinations as slug}
            {@const prefecture = prefectures.find((item) => item.slug === slug)}
            {#if prefecture}
              <a href="/area/{prefecture.slug}"><span>{prefecture.name}</span><small>{destinationCounts[slug] ?? 0}件</small></a>
            {/if}
          {/each}
        </aside>
      </div>

      <details class="prefecture-directory">
        <summary>都道府県の一覧から探す</summary>
        <div class="region-grid">
          {#each regions as region}
            <div class="region">
              <h3>{region}</h3>
              <div>{#each prefectures.filter((item) => item.region === region) as prefecture}<a href="/area/{prefecture.slug}">{prefecture.name}</a>{/each}</div>
            </div>
          {/each}
        </div>
      </details>
    </section>

    <section class="section itineraries" aria-labelledby="new-title">
      <div class="section-heading card-heading">
        <div><p>ITINERARIES</p><h2 id="new-title">公開されたしおり</h2></div>
        <div class="tag-filter" aria-label="旅のテーマで絞り込む">
          <button class:active={!selectedTag} onclick={() => (selectedTag = "")}>すべて</button>
          {#each travelTags.slice(0, 5) as tag}<button class:active={selectedTag === tag} onclick={() => (selectedTag = selectedTag === tag ? "" : tag)}>{tag}</button>{/each}
        </div>
      </div>

      {#if loading}
        <div class="loading" aria-live="polite">公開しおりを読み込んでいます…</div>
      {:else if loadError && itineraries.length === 0}
        <div class="empty"><p>{loadError}</p><button onclick={loadFeed}>もう一度試す</button></div>
      {:else if visibleItineraries.length}
        <div class="cards">{#each visibleItineraries as itinerary}<ItineraryCard {itinerary} />{/each}</div>
        {#if hasMore && !selectedTag}
          <div class="more"><button onclick={loadMore} disabled={loadingMore}>{loadingMore ? "読み込んでいます…" : "さらに見る"}</button></div>
        {/if}
      {:else}
        <div class="empty"><p>{selectedTag ? "このテーマのしおりはまだありません。" : "まだ公開されているしおりはありません。"}</p><a href="/profile">最初のしおりを公開する</a></div>
      {/if}
    </section>

    <section class="cycle" aria-label="しおりを公開する流れ">
      <div>
        <p>あなたの旅も、次の誰かのヒントに。</p>
        <h2>しおりを作って、完成したら公開。</h2>
        <span>公開設定は作成したしおりの中から行います。公開にはアカウントが必要です。</span>
      </div>
      <a href="/#create">しおりを作る</a>
    </section>
  </main>

  <PublicFooter />
</div>

<style>
  :global(body) { margin: 0; color: #27364f; background: #fbfcff; }
  .explore-page { min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; }

  .hero { padding: 74px 20px 68px; background: linear-gradient(145deg, #83c5ff 0%, #9eafff 48%, #c2ddfa 100%); }
  .hero-inner { width: min(900px, 100%); margin: 0 auto; text-align: center; }
  .eyebrow { margin: 0 0 12px; color: rgba(255,255,255,.9); font-size: 11px; font-weight: 900; letter-spacing: .18em; }
  h1 { margin: 0; color: white; font-size: clamp(31px, 5vw, 52px); line-height: 1.3; letter-spacing: .02em; text-shadow: 0 2px 12px rgba(49, 75, 145, .12); }
  .lead { max-width: 600px; margin: 18px auto 30px; color: rgba(255,255,255,.94); font-size: 14px; line-height: 1.8; }
  .mobile-break { display: none; }

  form { display: grid; grid-template-columns: 1fr 1fr auto; max-width: 760px; margin: 0 auto; padding: 9px; border-radius: 17px; background: rgba(255,255,255,.96); box-shadow: 0 16px 38px rgba(47, 75, 145, .18); text-align: left; }
  form label { display: flex; padding: 4px 14px; border-right: 1px solid #e6eaf2; flex-direction: column; }
  form label span { margin-bottom: 3px; color: #8994a8; font-size: 9px; font-weight: 800; }
  form select { min-width: 0; border: 0; outline: 0; color: #30405e; background: transparent; font: inherit; font-size: 13px; font-weight: 700; }
  form button { border: 0; border-radius: 11px; padding: 0 23px; color: white; background: #4d71cb; font-weight: 800; cursor: pointer; }
  form button:disabled { cursor: default; opacity: .45; }

  .section { width: min(1080px, calc(100% - 40px)); margin: 0 auto; padding: 76px 0; }
  .section-heading { display: flex; margin-bottom: 26px; align-items: flex-end; justify-content: space-between; gap: 20px; }
  .section-heading p { margin: 0 0 5px; color: #7696d3; font-size: 9px; font-weight: 900; letter-spacing: .18em; }
  .section-heading h2 { margin: 0; color: #263858; font-size: 27px; }
  .section-heading > span { color: #7d899c; font-size: 12px; }

  .map-layout { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 22px; align-items: stretch; }
  .popular { padding: 21px; border: 1px solid #e4eaf4; border-radius: 20px; background: white; }
  .popular h3 { margin: 0 0 10px; color: #435572; font-size: 13px; }
  .popular a { display: flex; padding: 13px 2px; border-bottom: 1px solid #edf1f6; align-items: center; justify-content: space-between; color: #34445f; text-decoration: none; font-size: 13px; font-weight: 700; }
  .popular a:last-child { border-bottom: 0; }
  .popular a:hover { color: #4d71cb; }
  .popular small { color: #9ba5b4; font-size: 10px; font-weight: 500; }
  .popular-empty { margin: 20px 0; color: #8a96a8; font-size: 11px; line-height: 1.7; }

  .prefecture-directory { margin-top: 18px; border: 1px solid #e4eaf4; border-radius: 14px; background: white; }
  .prefecture-directory summary { padding: 16px 18px; color: #4b5d79; font-size: 12px; font-weight: 800; cursor: pointer; }
  .region-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; padding: 4px 18px 20px; }
  .region h3 { margin: 0 0 7px; color: #7a88a0; font-size: 11px; }
  .region div { display: flex; flex-wrap: wrap; gap: 6px 10px; }
  .region a { color: #3f67b3; text-decoration: none; font-size: 11px; }

  .itineraries { padding-top: 14px; }
  .tag-filter { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 6px; }
  .tag-filter button { padding: 7px 10px; border: 1px solid #e1e7f1; border-radius: 999px; color: #66748b; background: white; font-size: 10px; font-weight: 700; cursor: pointer; }
  .tag-filter button.active { border-color: #6589d4; color: white; background: #6589d4; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .loading, .empty { padding: 40px; border-radius: 15px; color: #7d899c; background: #f4f7fc; text-align: center; font-size: 13px; }
  .empty p { margin: 0 0 10px; }
  .empty a, .empty button, .more button { border: 0; color: #4d71cb; background: transparent; font: inherit; font-weight: 800; text-decoration: none; cursor: pointer; }
  .more { margin-top: 24px; text-align: center; }
  .more button { padding: 10px 18px; border: 1px solid #ccd9ef; border-radius: 999px; background: white; }
  .more button:disabled { opacity: .55; cursor: wait; }

  .cycle { display: flex; width: min(1080px, calc(100% - 40px)); margin: 0 auto 72px; padding: 31px 34px; border-radius: 20px; align-items: center; justify-content: space-between; gap: 24px; color: #314362; background: linear-gradient(135deg, #edf6ff, #f0efff); }
  .cycle p { margin: 0 0 4px; color: #5978b5; font-size: 11px; font-weight: 800; }
  .cycle h2 { margin: 0 0 7px; font-size: 22px; }
  .cycle span { color: #748098; font-size: 12px; }
  .cycle a { flex: none; padding: 12px 19px; border-radius: 11px; color: white; background: #4d71cb; text-decoration: none; font-size: 12px; font-weight: 800; }

  @media (max-width: 800px) {
    .map-layout { grid-template-columns: 1fr; }
    .popular { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0 18px; }
    .popular h3 { grid-column: 1 / -1; }
    .region-grid { grid-template-columns: repeat(2, 1fr); }
    .cards { grid-template-columns: repeat(2, 1fr); }
    .card-heading { align-items: flex-start; flex-direction: column; }
    .tag-filter { justify-content: flex-start; }
  }

  @media (max-width: 600px) {
    .hero { padding: 52px 16px 46px; }
    .mobile-break { display: initial; }
    .lead { margin: 15px auto 24px; font-size: 12px; }
    form { grid-template-columns: 1fr; padding: 8px; }
    form label { padding: 9px 10px; border-right: 0; border-bottom: 1px solid #e8ecf3; }
    form select { font-size: 16px; }
    form button { margin-top: 8px; padding: 13px; }
    .section { width: calc(100% - 28px); padding: 54px 0; }
    .section-heading { margin-bottom: 18px; align-items: flex-start; flex-direction: column; }
    .section-heading h2 { font-size: 23px; }
    .section-heading > span { line-height: 1.6; }
    .popular { padding: 15px; }
    .region-grid { grid-template-columns: 1fr; }
    .cards { grid-template-columns: 1fr; }
    .cycle { width: calc(100% - 28px); margin-bottom: 54px; padding: 25px 22px; align-items: flex-start; flex-direction: column; }
    .cycle h2 { font-size: 19px; }
    .cycle span { display: block; line-height: 1.6; }
    .cycle a { width: 100%; box-sizing: border-box; text-align: center; }
  }
</style>
