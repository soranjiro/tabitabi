<script lang="ts">
  import { goto } from "$app/navigation";
  import ItineraryCard from "$lib/explore/ItineraryCard.svelte";
  import JapanMap from "$lib/explore/JapanMap.svelte";
  import PublicFooter from "$lib/explore/PublicFooter.svelte";
  import PublicHeader from "$lib/explore/PublicHeader.svelte";
  import { prefectures, regions } from "$lib/explore/data";

  let { data } = $props();
  let sort = $state("new");
  let openMap = $state(false);

  const sortedItineraries = $derived(
    sort === "popular"
      ? [...data.itineraries].sort((a, b) => b.copies - a.copies)
      : data.itineraries,
  );

  function moveArea(event: Event) {
    const target = event.currentTarget as HTMLSelectElement;
    if (target.value) goto(`/area/${target.value}`);
  }
</script>

<svelte:head>
  <title>{data.prefecture.name}の旅行しおり {data.prefecture.count}件｜たびたび</title>
  <meta
    name="description"
    content="{data.prefecture.name}へ旅行する人のための公開しおり一覧。みんなの旅程を参考にして、気になるプランは自分用にコピーできます。"
  />
  <link rel="canonical" href="https://tabitabi.pages.dev/area/{data.prefecture.slug}" />
  <meta property="og:title" content="{data.prefecture.name}の旅行しおり｜たびたび" />
  <meta property="og:description" content="{data.prefecture.name}のみんなの旅行プランを探そう。" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tabitabi.pages.dev/area/{data.prefecture.slug}" />
  <meta property="og:image" content="https://tabitabi.pages.dev/og.png" />
</svelte:head>

<div class="area-page">
  <PublicHeader active="explore" />

  <div class="breadcrumb-wrap">
    <nav class="breadcrumb" aria-label="パンくずリスト">
      <a href="/">ホーム</a><span>›</span><a href="/explore">みんなのしおり</a><span>›</span><strong>{data.prefecture.name}</strong>
    </nav>
  </div>

  <header class="area-hero">
    <div class="hero-inner">
      <div class="hero-copy">
        <p class="region-label">{data.prefecture.region} · {data.prefecture.slug.toUpperCase()}</p>
        <div class="title-row">
          <span class="stamp" aria-hidden="true">{data.prefecture.shortName.slice(0, 1)}</span>
          <div>
            <h1>{data.prefecture.name}<small>の旅行しおり</small></h1>
            <p>静かな朝の寺社から、路地裏の喫茶店まで。<br />旅した人のリアルなプランを集めました。</p>
          </div>
        </div>
      </div>

      <div class="count-card">
        <p>PUBLIC SHIORI</p>
        <strong>{data.prefecture.count}</strong>
        <span>件のしおり</span>
        <i aria-hidden="true"></i>
      </div>
    </div>
    <span class="hero-circle circle-one" aria-hidden="true"></span>
    <span class="hero-circle circle-two" aria-hidden="true"></span>
  </header>

  <main>
    <section class="results section-wrap" aria-labelledby="results-title">
      <div class="results-toolbar">
        <div>
          <p class="eyebrow">TRAVEL PLANS</p>
          <h2 id="results-title">{data.prefecture.name}を旅するプラン</h2>
          <span>公開されているしおりから、編集部おすすめを表示しています。</span>
        </div>
        <div class="filters">
          <button class:active={sort === "new"} onclick={() => (sort = "new")}>新着順</button>
          <button class:active={sort === "popular"} onclick={() => (sort = "popular")}>人気順</button>
        </div>
      </div>

      {#if sortedItineraries.length > 0}
        <div class="card-grid">
          {#each sortedItineraries as itinerary}
            <ItineraryCard {itinerary} />
          {/each}
        </div>
      {:else}
        <div class="empty-state">
          <span aria-hidden="true">旅</span>
          <h3>この旅先のしおりは、まだ準備中です</h3>
          <p>最初の旅のヒントを公開してみませんか？</p>
          <a href="/#create">しおりを作る</a>
        </div>
      {/if}
    </section>

    <section class="area-switcher" aria-labelledby="switch-title">
      <div class="section-wrap switch-grid">
        <div class="switch-copy">
          <p class="eyebrow">EXPLORE MORE</p>
          <h2 id="switch-title">次は、どこへ行く？</h2>
          <p>{data.prefecture.region}のほかの旅先や、47都道府県から探せます。</p>

          {#if data.nearby.length > 0}
            <div class="nearby-links">
              {#each data.nearby as nearby}
                <a href="/area/{nearby.slug}">{nearby.name}<span>{nearby.count}</span></a>
              {/each}
            </div>
          {/if}

          <label for="area-select">都道府県を変更</label>
          <select id="area-select" value={data.prefecture.slug} onchange={moveArea}>
            {#each regions as region}
              <optgroup label={region}>
                {#each prefectures.filter((prefecture) => prefecture.region === region) as prefecture}
                  <option value={prefecture.slug}>{prefecture.name}（{prefecture.count}件）</option>
                {/each}
              </optgroup>
            {/each}
          </select>
          <button class="map-toggle" onclick={() => (openMap = !openMap)} aria-expanded={openMap}>
            {openMap ? "地図を閉じる" : "日本地図から選ぶ"}<span>{openMap ? "−" : "＋"}</span>
          </button>
        </div>

        <div class="map-preview" class:open={openMap}>
          <JapanMap activeSlug={data.prefecture.slug} />
        </div>
      </div>
    </section>

    <section class="copy-message">
      <div>
        <span class="copy-mark" aria-hidden="true">＋</span>
        <p>いいプランを見つけたら</p>
        <h2>コピーして、自分だけの旅に。</h2>
        <a href="/itineraries/kyoto-weekend">コピーできるしおりを見てみる <span>→</span></a>
      </div>
    </section>
  </main>

  <PublicFooter />
</div>

<style>
  :global(body) { background: #fffdf8; }

  .area-page {
    min-height: 100vh;
    color: #203d3f;
    background: #fffdf8;
    font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif;
  }

  .breadcrumb-wrap {
    background: #fbf8f1;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    width: min(1120px, calc(100% - 40px));
    height: 47px;
    margin: 0 auto;
    color: #99a4a2;
    font-size: 9px;
  }

  .breadcrumb a { color: #718684; text-decoration: none; }
  .breadcrumb strong { color: #536d6c; font-weight: 700; }

  .area-hero {
    position: relative;
    overflow: hidden;
    padding: 76px 20px 82px;
    color: white;
    background: #183f42;
  }

  .hero-inner {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 50px;
    width: min(1030px, 100%);
    margin: 0 auto;
  }

  .region-label,
  .eyebrow {
    margin: 0 0 14px;
    color: #ef9e8f;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.19em;
  }

  .title-row {
    display: flex;
    align-items: flex-start;
    gap: 23px;
  }

  .stamp {
    display: grid;
    flex: none;
    width: 70px;
    height: 70px;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.48);
    border-radius: 50%;
    color: #ffd5c8;
    font-family: "Yu Mincho", serif;
    font-size: 29px;
  }

  h1 {
    margin: 0;
    font-family: "Yu Mincho", serif;
    font-size: clamp(34px, 5vw, 52px);
    font-weight: 600;
    letter-spacing: 0.05em;
  }

  h1 small {
    margin-left: 9px;
    color: #bdd0cd;
    font-size: 18px;
    font-weight: 500;
  }

  .title-row p {
    margin: 16px 0 0;
    color: #b8ccca;
    font-size: 12px;
    line-height: 1.9;
  }

  .count-card {
    position: relative;
    width: 190px;
    flex: none;
    padding: 23px 24px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.055);
    text-align: right;
  }

  .count-card p {
    margin: 0;
    color: #8fb0ad;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.16em;
  }

  .count-card strong {
    display: inline-block;
    margin-top: 8px;
    font-family: Georgia, serif;
    font-size: 54px;
    font-weight: 400;
    line-height: 1;
  }

  .count-card span { margin-left: 5px; color: #bed0ce; font-size: 10px; }
  .count-card i { position: absolute; left: 22px; bottom: 24px; width: 32px; height: 1px; background: #e98070; }

  .hero-circle {
    position: absolute;
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 50%;
  }

  .circle-one { width: 470px; height: 470px; right: -140px; top: -280px; }
  .circle-two { width: 350px; height: 350px; left: -220px; bottom: -290px; }

  .section-wrap {
    width: min(1120px, calc(100% - 40px));
    margin: 0 auto;
  }

  .results { padding-top: 90px; padding-bottom: 110px; }

  .results-toolbar {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 30px;
    margin-bottom: 34px;
  }

  .results-toolbar h2,
  .switch-copy h2,
  .copy-message h2 {
    margin: 0;
    color: #214748;
    font-family: "Yu Mincho", serif;
    font-size: clamp(27px, 4vw, 37px);
    line-height: 1.4;
  }

  .results-toolbar > div > span,
  .switch-copy > p:nth-of-type(2) {
    display: block;
    margin-top: 9px;
    color: #839190;
    font-size: 11px;
    line-height: 1.7;
  }

  .filters {
    display: flex;
    padding: 4px;
    border: 1px solid #e2e5df;
    border-radius: 999px;
    background: #f8f8f3;
  }

  .filters button {
    border: 0;
    border-radius: 999px;
    padding: 8px 15px;
    color: #7c8b89;
    background: transparent;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }

  .filters button.active { color: white; background: #294f51; }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 22px;
  }

  .empty-state {
    padding: 70px 20px;
    border: 1px dashed #cad9d3;
    border-radius: 22px;
    background: #f5f7f1;
    text-align: center;
  }

  .empty-state > span { display: grid; width: 52px; height: 52px; place-items: center; margin: 0 auto; border: 1px solid #df8a7c; border-radius: 50%; color: #d96556; font-family: serif; }
  .empty-state h3 { margin: 18px 0 7px; font-family: serif; font-size: 22px; }
  .empty-state p { margin: 0; color: #7c8c8a; font-size: 12px; }
  .empty-state a { display: inline-block; margin-top: 22px; padding: 11px 18px; border-radius: 999px; color: white; background: #173f42; text-decoration: none; font-size: 11px; font-weight: 800; }

  .area-switcher {
    padding: 88px 0;
    background: #eff4ed;
  }

  .switch-grid {
    display: grid;
    grid-template-columns: 310px minmax(0, 1fr);
    gap: 60px;
    align-items: center;
  }

  .nearby-links {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin: 24px 0 28px;
  }

  .nearby-links a {
    display: inline-flex;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 7px;
    color: #4e6d6b;
    background: white;
    text-decoration: none;
    font-size: 10px;
    font-weight: 700;
  }

  .nearby-links span { color: #dc6c5d; font-size: 8px; }

  .switch-copy label {
    display: block;
    margin-bottom: 6px;
    color: #758785;
    font-size: 9px;
    font-weight: 800;
  }

  .switch-copy select {
    width: 100%;
    height: 46px;
    padding: 0 13px;
    border: 1px solid #d9e2db;
    border-radius: 10px;
    color: #355958;
    background: white;
    font-size: 12px;
    font-weight: 700;
  }

  .map-toggle {
    display: none;
    width: 100%;
    justify-content: space-between;
    margin-top: 10px;
    padding: 13px;
    border: 1px solid #cfdcd5;
    border-radius: 10px;
    color: #315758;
    background: transparent;
    font-size: 11px;
    font-weight: 800;
  }

  .map-preview { min-width: 0; }
  .map-preview :global(.map-shell) { box-shadow: none; }

  .copy-message {
    padding: 96px 20px;
    text-align: center;
    background: #fffdf8;
  }

  .copy-message > div { width: min(620px, 100%); margin: 0 auto; }
  .copy-mark { display: grid; width: 48px; height: 48px; place-items: center; margin: 0 auto 18px; border-radius: 50%; color: white; background: #e16a59; font-size: 22px; }
  .copy-message p { margin: 0 0 8px; color: #d76556; font-size: 10px; font-weight: 800; }
  .copy-message a { display: inline-flex; gap: 15px; margin-top: 26px; padding-bottom: 5px; border-bottom: 1px solid #173f42; color: #173f42; text-decoration: none; font-size: 11px; font-weight: 800; }

  @media (max-width: 900px) {
    .card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .switch-grid { grid-template-columns: 1fr; gap: 30px; }
    .map-preview { display: none; }
    .map-preview.open { display: block; }
    .map-toggle { display: flex; }
  }

  @media (max-width: 650px) {
    .breadcrumb { width: calc(100% - 28px); }
    .area-hero { padding: 56px 16px 62px; }
    .hero-inner { align-items: flex-start; }
    .count-card { width: auto; padding: 12px; border-radius: 12px; }
    .count-card p, .count-card span, .count-card i { display: none; }
    .count-card strong { margin: 0; font-size: 34px; }
    .title-row { gap: 13px; }
    .stamp { width: 50px; height: 50px; font-size: 22px; }
    h1 small { display: block; margin: 4px 0 0; font-size: 14px; }
    .title-row p br { display: none; }
    .section-wrap { width: calc(100% - 28px); }
    .results, .area-switcher { padding-top: 70px; padding-bottom: 76px; }
    .results-toolbar { align-items: flex-start; flex-direction: column; }
    .card-grid { grid-template-columns: 1fr; }
  }
</style>
