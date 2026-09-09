<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import type { PublicFeedItem } from '@tabitabi/types';
  import type { PageData } from './$types';
  import { userApi } from '$lib/api/user';
  import ItineraryCard from '$lib/explore/ItineraryCard.svelte';
  import PublicHeader from '$lib/explore/PublicHeader.svelte';
  import PublicFooter from '$lib/explore/PublicFooter.svelte';
  import { prefectures, regions, travelTags } from '$lib/explore/data';

  let { data }: { data: PageData } = $props();
  let destination = $state('');
  let tags = $state<string[]>([]);
  let duration = $state('');
  let itineraries = $state<PublicFeedItem[]>(data.feed?.items ?? []);
  let destinationCounts = $state<Record<string, number>>(data.feed?.destinationCounts ?? {});
  let loading = $state(!data.feed);
  let loadingMore = $state(false);
  let hasMore = $state(data.feed?.hasMore ?? false);
  let filterOpen = $state(false);
  let error = $state('');
  const loadingPlaceholders = Array.from({ length: 6 });
  const quick = ['kyoto', 'tokyo', 'okinawa', 'hokkaido'];
  const visible = $derived(itineraries.filter(item => {
    if (tags.length && !tags.some(tag => item.tags.includes(tag))) return false;
    if (duration) {
      if (item.start_at == null || item.end_at == null) return false;
      const days = Math.max(1, Math.ceil((item.end_at - item.start_at) / 86400000) + 1);
      if (duration === 'day' && days !== 1) return false;
      if (duration === '2' && days !== 2) return false;
      if (duration === '3' && days !== 3) return false;
      if (duration === 'long' && days < 4) return false;
    }
    return true;
  }));
  const popularRegions = ['北海道', '東北', '関東', '中部', '近畿', '中国', '四国', '九州・沖縄'];
  const regionImage: Record<string, string> = {
    北海道: '/hero/background-winter.avif',
    東北: '/itinerary-backgrounds/hot-spring.avif',
    関東: '/hero/background-spring.avif',
    中部: '/hero/background-autumn.avif',
    近畿: '/itinerary-backgrounds/japanese.avif',
    中国: '/itinerary-backgrounds/coastal-drive.avif',
    四国: '/itinerary-backgrounds/sky.avif',
    '九州・沖縄': '/hero/background-summer.avif',
  };

  onMount(() => {
    if (!data.feed) void load();
  });

  async function load() {
    loading = true;
    error = '';
    try {
      const result = await userApi.getPublicFeed(0);
      itineraries = result.items;
      destinationCounts = result.destinationCounts;
      hasMore = result.hasMore;
    } catch {
      error = 'しおりを読み込めませんでした。';
    } finally {
      loading = false;
    }
  }

  async function more() {
    loadingMore = true;
    try {
      const result = await userApi.getPublicFeed(itineraries.length);
      itineraries = [...itineraries, ...result.items];
      hasMore = result.hasMore;
    } catch {
      error = '追加のしおりを読み込めませんでした。';
    } finally {
      loadingMore = false;
    }
  }

  function search() {
    if (destination) void goto(`/area/${destination}${tags[0] ? `?tag=${encodeURIComponent(tags[0])}` : ''}`);
    else filterOpen = false;
  }

  function toggleTag(tag: string) {
    tags = tags.includes(tag) ? tags.filter(value => value !== tag) : [...tags, tag];
  }
</script>

<svelte:head>
  <title>みんなのしおり - たびたび</title>
  <meta name="description" content="誰かの旅から、次の旅を見つけよう。行き先やテーマから公開された旅行しおりを探せます。" />
  <link rel="canonical" href="https://tabitabi.pages.dev/explore" />
  <link rel="preload" as="image" href="/itinerary-backgrounds/coastal-drive.avif" fetchpriority="high" />
</svelte:head>

<div class="page">
  <PublicHeader active="explore" />
  <main>
    <section class="hero">
      <img
        class="hero-image"
        src="/itinerary-backgrounds/coastal-drive.avif"
        alt=""
        width="1600"
        height="900"
        loading="eager"
        fetchpriority="high"
        decoding="async"
      />
      <div class="hero-copy"><h1>みんなのしおり</h1><p>誰かの旅から、次の旅を見つけよう。</p></div>
      <button class="search-launch" onclick={() => filterOpen = true}>⌕ <span>行き先・テーマで探す</span></button>
      <div class="quick-links">
        {#each quick as slug}
          {@const item = prefectures.find(p => p.slug === slug)}
          {#if item}<a href="/area/{slug}">{item.name.replace(/[都道府県]$/, '')}</a>{/if}
        {/each}
        {#each ['温泉', 'グルメ', 'ひとり旅'] as tag}
          <button onclick={() => { tags = [tag]; filterOpen = true; }}>{tag}</button>
        {/each}
        <button onclick={() => filterOpen = true}>すべての条件 →</button>
      </div>
    </section>

    <section class="section trips" aria-labelledby="trips-title">
      <div class="heading"><h2 id="trips-title">みんなの旅</h2><span>新しい順　⌄</span></div>
      {#if loading}
        <div class="cards skeleton-grid" aria-hidden="true">{#each loadingPlaceholders as _}<div class="skeleton-card"><i></i><b></b><span></span></div>{/each}</div>
      {:else if error && !itineraries.length}
        <div class="state"><p>{error}</p><button onclick={load}>もう一度試す</button></div>
      {:else if visible.length}
        <div class="cards">
          {#each visible as itinerary, index}
            <ItineraryCard {itinerary} compact eager={index < 2} />
          {/each}
        </div>
        {#if hasMore}<button class="more" onclick={more} disabled={loadingMore}>{loadingMore ? '読み込み中…' : 'もっと見る'}</button>{/if}
      {:else}
        <div class="state"><p>この条件のしおりはまだありません。</p><button onclick={() => { tags = []; duration = ''; }}>条件を戻す</button></div>
      {/if}
    </section>

    <section class="section destinations" aria-labelledby="dest-title">
      <div class="heading"><h2 id="dest-title">行き先から探す</h2></div>
      <div class="region-layout">
        <div class="region-cards">
          {#each popularRegions as region}
            <a href="/area/{prefectures.find(p => p.region === region)?.slug}"><img src={regionImage[region]} alt="" loading="lazy" decoding="async" width="220" height="75" /><strong>{region}</strong></a>
          {/each}
        </div>
        <a class="map-card" href="#prefectures"><span>日本地図から探す</span><small>都道府県から<br />しおりを見つけよう</small><b>→</b><img src="/maps/japan-prefectures.svg" alt="" loading="lazy" decoding="async" width="320" height="320" /></a>
      </div>
      <details id="prefectures"><summary>都道府県の一覧を見る</summary><div class="prefectures">{#each regions as region}<div><strong>{region}</strong>{#each prefectures.filter(p => p.region === region) as p}<a href="/area/{p.slug}">{p.name}<small>{destinationCounts[p.slug] ?? 0}</small></a>{/each}</div>{/each}</div></details>
    </section>

    <section class="cta"><div><p>あなたの旅も、<br />誰かの次の旅になる。</p><a href="/#create">しおりを作る　→</a></div></section>
  </main>
  <PublicFooter />
</div>

{#if filterOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="filter-backdrop" onclick={(event) => event.target === event.currentTarget && (filterOpen = false)}>
    <form class="filter" onsubmit={(event) => { event.preventDefault(); search(); }}>
      <button type="button" class="close" onclick={() => filterOpen = false} aria-label="検索条件を閉じる">×</button>
      <h2>しおりを探す</h2>
      <label>行き先<select bind:value={destination}><option value="">都道府県を選択</option>{#each prefectures as p}<option value={p.slug}>{p.name}</option>{/each}</select></label>
      <fieldset><legend>テーマ</legend><div>{#each travelTags.slice(0, 8) as tag}<button type="button" class:active={tags.includes(tag)} onclick={() => toggleTag(tag)}>{tag}</button>{/each}</div></fieldset>
      <fieldset><legend>日数</legend><div>{#each [['day','日帰り'],['2','1泊2日'],['3','2泊3日'],['long','それ以上']] as option}<button type="button" class:active={duration === option[0]} onclick={() => duration = duration === option[0] ? '' : option[0]}>{option[1]}</button>{/each}</div></fieldset>
      <button class="submit" type="submit">{destination ? 'この条件で探す' : `この条件で見る（${visible.length}件）`}</button>
      <button class="reset" type="button" onclick={() => { destination = ''; tags = []; duration = ''; }}>リセット</button>
    </form>
  </div>
{/if}

<style>
  :global(body){margin:0;color:#132d32;background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN","Yu Gothic",sans-serif}
  .page{min-height:100vh}
  .hero{position:relative;display:grid;min-height:300px;padding:45px 20px 28px;place-content:center;overflow:hidden;background:#eef8f9}
  .hero-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .hero::before{content:'';position:absolute;z-index:1;inset:0;background:linear-gradient(rgba(239,249,252,.3),rgba(255,255,255,.28))}
  .hero::after{content:'';position:absolute;z-index:1;inset:auto 0 0;height:70px;background:linear-gradient(transparent,#fff)}
  .hero-copy,.search-launch,.quick-links{position:relative;z-index:2}
  .hero-copy{text-align:center;text-shadow:0 1px 12px white}
  .hero h1{margin:0;font-family:"Yu Mincho",serif;font-size:clamp(2rem,5vw,3.5rem);letter-spacing:.08em}
  .hero p{margin:.65rem 0 1.4rem;font-family:serif;font-weight:700}
  .search-launch{display:flex;width:min(480px,calc(100vw - 40px));margin:auto;padding:1rem 1.4rem;border:1px solid #dce5e3;border-radius:99px;gap:.7rem;background:rgba(255,255,255,.95);color:#415858;font:inherit;font-size:.85rem;box-shadow:0 4px 18px rgba(28,72,75,.1);cursor:pointer}
  .quick-links{display:flex;margin:1rem auto 0;justify-content:center;flex-wrap:wrap;gap:.45rem}
  .quick-links a,.quick-links button{padding:.42rem .75rem;border:1px solid #dbe3e0;border-radius:99px;color:#38514d;background:rgba(255,255,255,.95);font:inherit;font-size:.7rem;text-decoration:none;cursor:pointer}
  .section{width:min(1080px,calc(100% - 36px));margin:auto;padding:50px 0}
  .heading{display:flex;margin-bottom:1.25rem;align-items:center;justify-content:space-between}
  .heading h2{margin:0;font-family:serif;font-size:1.45rem}
  .heading span{font-size:.72rem}
  .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
  .skeleton-card{height:190px;overflow:hidden;border:1px solid #edf0ef;border-radius:16px;background:#fff}
  .skeleton-card i{display:block;height:78px;background:#edf2f1}
  .skeleton-card b,.skeleton-card span{display:block;height:12px;margin:18px 16px 0;border-radius:99px;background:#eef2f1}
  .skeleton-card b{width:72%}
  .skeleton-card span{width:48%;margin-top:10px}
  .more{display:block;margin:1.5rem auto 0;padding:.7rem 3rem;border:1px solid #dbe2e0;border-radius:99px;background:#fff;color:#294744}
  .destinations,.cta{content-visibility:auto;contain-intrinsic-size:600px}
  .region-layout{display:grid;grid-template-columns:2fr 1fr;gap:1rem}
  .region-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:.65rem}
  .region-cards a{overflow:hidden;border:1px solid #e0e5e3;border-radius:6px;color:#273f3d;text-align:center;text-decoration:none;font-size:.72rem}
  .region-cards img{display:block;width:100%;height:75px;object-fit:cover}
  .region-cards strong{display:block;padding:.55rem}
  .map-card{position:relative;min-height:210px;padding:1.5rem;overflow:hidden;border-radius:10px;background:#eaf5f4;color:#174b40;text-decoration:none}
  .map-card span,.map-card small,.map-card b{position:relative;z-index:1;display:block}
  .map-card span{font-weight:800}
  .map-card small{margin-top:.5rem;line-height:1.7}
  .map-card b{margin-top:1rem;width:2rem;height:2rem;border-radius:50%;background:#075f55;color:#fff;text-align:center;line-height:2rem}
  .map-card img{position:absolute;width:65%;height:auto;right:-5%;bottom:-25%;opacity:.28}
  details{margin-top:1rem;border:1px solid #e0e5e3;border-radius:8px}
  summary{padding:1rem;cursor:pointer}
  .prefectures{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;padding:1rem}
  .prefectures div{display:flex;flex-direction:column;gap:.35rem}
  .prefectures a{display:flex;justify-content:space-between;color:#39524e;text-decoration:none;font-size:.75rem}
  .cta{width:min(1080px,calc(100% - 36px));min-height:220px;margin:20px auto 60px;border-radius:10px;background:linear-gradient(90deg,rgba(224,244,242,.95),rgba(224,244,242,.2)),url('/itinerary-backgrounds/coastal-drive.avif') center/cover}
  .cta div{padding:2.3rem}
  .cta p{font-family:serif;font-size:1.7rem;line-height:1.6}
  .cta a{display:inline-block;padding:.8rem 1.5rem;border-radius:99px;background:#076455;color:#fff;text-decoration:none;font-size:.8rem}
  .state{text-align:center;padding:3rem;color:#5d6d6b}
  .filter-backdrop{position:fixed;z-index:2000;inset:0;display:flex;justify-content:flex-end;background:rgba(12,31,32,.35)}
  .filter{width:min(390px,100%);height:100%;box-sizing:border-box;padding:2rem 1.4rem;overflow:auto;background:#fff}
  .filter h2{font-family:serif}
  .close{float:right;border:0;background:none;font-size:1.4rem}
  .filter label{display:grid;gap:.5rem;font-size:.75rem;font-weight:700}
  .filter select{padding:.8rem;border:1px solid #d9e0de;border-radius:8px;background:#fff}
  .filter fieldset{margin:1.5rem 0;padding:0;border:0}
  .filter legend{margin-bottom:.6rem;font-size:.75rem;font-weight:700}
  .filter fieldset div{display:flex;flex-wrap:wrap;gap:.45rem}
  .filter fieldset button{padding:.5rem .75rem;border:1px solid #dce2e0;border-radius:7px;background:#fff;font-size:.72rem}
  .filter fieldset button.active{border-color:#176656;background:#eaf5f1;color:#075a4c}
  .submit,.reset{width:100%;padding:.9rem;border:0;font-weight:700}
  .submit{border-radius:99px;background:#126754;color:white}
  .reset{margin-top:.5rem;background:none;color:#3d5d58}

  @media(max-width:700px){
    .hero{min-height:240px;padding-top:25px;place-content:start}
    .hero-copy{text-align:left}
    .hero h1{font-size:1.7rem}
    .hero p{max-width:220px;line-height:1.7}
    .quick-links{justify-content:flex-start;flex-wrap:nowrap;overflow:auto}
    .section{padding:34px 0}
    .cards{grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}
    .skeleton-card{height:170px;border-radius:8px}
    .skeleton-card i{height:100px}
    .region-layout{display:block}
    .region-cards{grid-template-columns:repeat(4,1fr);gap:.4rem}
    .region-cards img{display:none}
    .map-card{min-height:70px;margin-top:.7rem;padding:1rem}
    .map-card img{width:35%;bottom:-80%}
    .prefectures{grid-template-columns:repeat(2,1fr)}
    .cta{min-height:180px}
    .cta div{padding:1.4rem}
    .cta p{font-size:1.25rem}
    .filter{height:auto;max-height:94dvh;margin-top:auto;border-radius:18px 18px 0 0}
    .filter-backdrop{align-items:flex-end}
    .quick-links button:last-child{display:none}
  }
  .map-card{display:block}
</style>
