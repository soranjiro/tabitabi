<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { userApi } from "$lib/api/user";
  import type { PublicFeedItem } from "@tabitabi/types";
  import ItineraryCard from "$lib/explore/ItineraryCard.svelte";
  import JapanMap from "$lib/explore/JapanMap.svelte";
  import PublicFooter from "$lib/explore/PublicFooter.svelte";
  import PublicHeader from "$lib/explore/PublicHeader.svelte";
  import { prefectures, regions, travelTags } from "$lib/explore/data";

  let { data } = $props();
  let sort = $state<"new" | "popular">("new");
  let selectedArea = $state("");
  let selectedTag = $state("");
  let itineraries = $state<PublicFeedItem[]>([]);
  let counts = $state<Record<string, number>>({});
  let loading = $state(true);
  let loadError = $state("");

  const availableAreas = $derived([...new Set(itineraries.flatMap((item) => item.areas))]);
  const availableTags = $derived(travelTags.filter((tag) => itineraries.some((item) => item.tags.includes(tag))));
  const filteredItineraries = $derived.by(() => {
    const matches = itineraries.filter((item) =>
      (!selectedArea || item.areas.includes(selectedArea)) &&
      (!selectedTag || item.tags.includes(selectedTag)),
    );
    return sort === "popular" ? [...matches].sort((a, b) => b.copies - a.copies) : matches;
  });

  onMount(async () => {
    selectedTag = new URLSearchParams(window.location.search).get("tag") ?? "";
    try {
      const result = await userApi.getPublicFeed(0, { prefecture: data.prefecture.slug });
      itineraries = result.items;
      counts = result.destinationCounts;
    } catch {
      loadError = "公開しおりを読み込めませんでした。";
    } finally {
      loading = false;
    }
  });

  function moveArea(event: Event) {
    const slug = (event.currentTarget as HTMLSelectElement).value;
    if (slug) void goto(`/area/${slug}`);
  }
</script>

<svelte:head>
  <title>{data.prefecture.name}の旅行しおり｜たびたび</title>
  <meta name="description" content="{data.prefecture.name}へ旅行する人のための公開しおり一覧。エリアや旅のテーマで探して、自分のしおりにコピーできます。" />
  <link rel="canonical" href="https://tabitabi.pages.dev/area/{data.prefecture.slug}" />
  <meta property="og:title" content="{data.prefecture.name}の旅行しおり｜たびたび" />
  <meta property="og:description" content="{data.prefecture.name}のみんなの旅行プランを探そう。" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tabitabi.pages.dev/area/{data.prefecture.slug}" />
  <meta property="og:image" content="https://tabitabi.pages.dev/og-explore.png" />
</svelte:head>

<div class="area-page">
  <PublicHeader active="explore" />

  <main>
    <nav class="breadcrumb" aria-label="パンくずリスト"><a href="/">ホーム</a><span>›</span><a href="/explore">みんなのしおり</a><span>›</span><strong>{data.prefecture.name}</strong></nav>

    <header class="hero">
      <div>
        <p>{data.prefecture.region}</p>
        <h1>{data.prefecture.name}<small>の旅行しおり</small></h1>
        <span>{counts[data.prefecture.slug] ?? 0}件の公開しおり</span>
      </div>
      <label>ほかの都道府県
        <select value={data.prefecture.slug} onchange={moveArea}>
          {#each regions as region}<optgroup label={region}>{#each prefectures.filter((item) => item.region === region) as prefecture}<option value={prefecture.slug}>{prefecture.name}</option>{/each}</optgroup>{/each}
        </select>
      </label>
    </header>

    <section class="results" aria-labelledby="results-title">
      <div class="heading">
        <div><p>ITINERARIES</p><h2 id="results-title">旅程から選ぶ</h2></div>
        <div class="sort"><button class:active={sort === "new"} onclick={() => (sort = "new")}>新着順</button><button class:active={sort === "popular"} onclick={() => (sort = "popular")}>コピー順</button></div>
      </div>

      {#if !loading && (availableAreas.length || availableTags.length)}
        <div class="filters">
          {#if availableAreas.length}
            <div><strong>エリア</strong><button class:active={!selectedArea} onclick={() => (selectedArea = "")}>すべて</button>{#each availableAreas as area}<button class:active={selectedArea === area} onclick={() => (selectedArea = selectedArea === area ? "" : area)}>{area}</button>{/each}</div>
          {/if}
          {#if availableTags.length}
            <div><strong>旅のテーマ</strong><button class:active={!selectedTag} onclick={() => (selectedTag = "")}>すべて</button>{#each availableTags as tag}<button class:active={selectedTag === tag} onclick={() => (selectedTag = selectedTag === tag ? "" : tag)}>{tag}</button>{/each}</div>
          {/if}
        </div>
      {/if}

      {#if loading}
        <div class="empty"><p>公開しおりを読み込んでいます…</p></div>
      {:else if loadError}
        <div class="empty"><p>{loadError}</p></div>
      {:else if filteredItineraries.length}
        <div class="cards">{#each filteredItineraries as itinerary}<ItineraryCard {itinerary} />{/each}</div>
      {:else}
        <div class="empty"><p>条件に合うしおりはまだありません。</p><button onclick={() => { selectedArea = ""; selectedTag = ""; }}>絞り込みを解除</button></div>
      {/if}
    </section>

    <details class="map-details"><summary>地図からほかの旅先を探す</summary><JapanMap activeSlug={data.prefecture.slug} {counts} /></details>

    <section class="nearby">
      <h2>{data.prefecture.region}のほかの旅先</h2>
      <div>{#each data.nearby as item}<a href="/area/{item.slug}">{item.name}<small>{counts[item.slug] ?? 0}件</small></a>{/each}</div>
    </section>
  </main>

  <PublicFooter />
</div>

<style>
  :global(body) { margin: 0; color: #27364f; background: #fbfcff; }
  .area-page { min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; }
  main { width: min(1080px, calc(100% - 40px)); margin: 0 auto; }
  .breadcrumb { display: flex; padding: 20px 0; align-items: center; gap: 8px; color: #8d98aa; font-size: 10px; }
  .breadcrumb a { color: #6482bb; text-decoration: none; }
  .breadcrumb strong { color: #68768c; }

  .hero { display: flex; padding: 37px 40px; border-radius: 22px; align-items: flex-end; justify-content: space-between; gap: 30px; background: linear-gradient(135deg, #dff0ff, #ebeaff); }
  .hero p { margin: 0 0 5px; color: #6887c6; font-size: 10px; font-weight: 900; letter-spacing: .13em; }
  .hero h1 { margin: 0; color: #293d63; font-size: clamp(30px, 5vw, 45px); }
  .hero h1 small { margin-left: 7px; font-size: .45em; }
  .hero span { display: block; margin-top: 9px; color: #6f7f99; font-size: 12px; }
  .hero label { display: flex; flex: none; width: 180px; padding: 9px 12px; border-radius: 11px; color: #8a95a8; background: rgba(255,255,255,.84); flex-direction: column; font-size: 9px; font-weight: 800; }
  .hero select { margin-top: 3px; border: 0; outline: 0; color: #405474; background: transparent; font: inherit; font-size: 13px; font-weight: 700; }

  .results { padding: 62px 0; }
  .heading { display: flex; margin-bottom: 20px; align-items: flex-end; justify-content: space-between; gap: 20px; }
  .heading p { margin: 0 0 5px; color: #7593ce; font-size: 9px; font-weight: 900; letter-spacing: .16em; }
  .heading h2 { margin: 0; color: #293b5b; font-size: 26px; }
  .sort { display: flex; gap: 5px; }
  .sort button, .filters button { border: 1px solid #e1e7f1; border-radius: 999px; color: #66748b; background: white; font-size: 10px; font-weight: 700; cursor: pointer; }
  .sort button { padding: 7px 11px; }
  .sort button.active, .filters button.active { border-color: #6385cd; color: white; background: #6385cd; }

  .filters { display: grid; margin-bottom: 25px; padding: 16px 18px; border: 1px solid #e4eaf4; border-radius: 14px; gap: 12px; background: white; }
  .filters > div { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .filters strong { width: 76px; color: #52627a; font-size: 11px; }
  .filters button { padding: 6px 9px; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .empty { padding: 40px; border-radius: 15px; color: #718096; background: #f1f5fb; text-align: center; }
  .empty button { border: 0; color: #4d71cb; background: transparent; font-weight: 700; cursor: pointer; }

  .map-details { margin-bottom: 55px; }
  .map-details > summary { margin-bottom: 12px; color: #4e6488; font-size: 13px; font-weight: 800; cursor: pointer; }
  .nearby { margin-bottom: 72px; padding: 26px; border: 1px solid #e4eaf4; border-radius: 17px; background: white; }
  .nearby h2 { margin: 0 0 15px; color: #354969; font-size: 17px; }
  .nearby div { display: flex; flex-wrap: wrap; gap: 8px; }
  .nearby a { display: flex; padding: 9px 12px; border-radius: 9px; color: #4268af; background: #f1f5fd; text-decoration: none; font-size: 11px; font-weight: 800; }
  .nearby small { margin-left: 7px; color: #8998b1; font-weight: 500; }

  @media (max-width: 800px) { .cards { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px) {
    main { width: calc(100% - 28px); }
    .hero { padding: 27px 22px; align-items: stretch; flex-direction: column; }
    .hero label { width: auto; }
    .hero select { font-size: 16px; }
    .results { padding: 46px 0; }
    .heading { align-items: flex-start; flex-direction: column; }
    .filters { padding: 14px; }
    .filters strong { width: 100%; margin-bottom: 2px; }
    .cards { grid-template-columns: 1fr; }
    .nearby { margin-bottom: 52px; padding: 21px; }
  }
</style>
