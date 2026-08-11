<script lang="ts">
  import { goto } from "$app/navigation";
  import ItineraryCard from "$lib/explore/ItineraryCard.svelte";
  import JapanMap from "$lib/explore/JapanMap.svelte";
  import PublicFooter from "$lib/explore/PublicFooter.svelte";
  import PublicHeader from "$lib/explore/PublicHeader.svelte";
  import {
    featuredDestinations,
    prefectures,
    publicItineraries,
    regions,
  } from "$lib/explore/data";

  let selectedDestination = $state("");

  const featured = featuredDestinations
    .map((slug) => prefectures.find((prefecture) => prefecture.slug === slug))
    .filter((prefecture) => prefecture !== undefined);

  function openSelectedDestination() {
    if (selectedDestination) goto(`/area/${selectedDestination}`);
  }
</script>

<svelte:head>
  <title>みんなのしおり｜旅先から旅行プランを探す - たびたび</title>
  <meta
    name="description"
    content="47都道府県から、みんなが公開した旅行しおりを探せます。気になる旅程はコピーして、自分の旅行計画に使えます。"
  />
  <link rel="canonical" href="https://tabitabi.pages.dev/explore" />
  <meta property="og:title" content="みんなのしおり｜たびたび" />
  <meta property="og:description" content="誰かの旅が、次の旅のヒントになる。都道府県から公開しおりを探そう。" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tabitabi.pages.dev/explore" />
  <meta property="og:image" content="https://tabitabi.pages.dev/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="explore-page">
  <PublicHeader active="explore" />

  <section class="hero">
    <span class="hero-decoration decoration-one" aria-hidden="true"></span>
    <span class="hero-decoration decoration-two" aria-hidden="true"></span>
    <div class="hero-inner">
      <div class="hero-copy">
        <p class="eyebrow"><span aria-hidden="true">✦</span> TRIP IDEAS FROM TRAVELERS</p>
        <h1>誰かの旅が、<br /><em>次の旅</em>のヒントになる。</h1>
        <p class="lead">
          みんなが作った旅のしおりを、行きたい場所から探せます。<br />
          見つけたプランは、そのまま自分用にコピー。
        </p>

        <div class="destination-search">
          <label for="destination">行きたい都道府県</label>
          <div class="search-row">
            <div class="select-wrap">
              <span aria-hidden="true">⌖</span>
              <select id="destination" bind:value={selectedDestination} onchange={openSelectedDestination}>
                <option value="">都道府県を選んでください</option>
                {#each regions as region}
                  <optgroup label={region}>
                    {#each prefectures.filter((prefecture) => prefecture.region === region) as prefecture}
                      <option value={prefecture.slug}>{prefecture.name}（{prefecture.count}件）</option>
                    {/each}
                  </optgroup>
                {/each}
              </select>
            </div>
            <button onclick={openSelectedDestination} disabled={!selectedDestination}>しおりを探す</button>
          </div>
        </div>

        <div class="hero-proof" aria-label="公開しおりの情報">
          <div class="avatar-stack" aria-hidden="true">
            <span>M</span><span>S</span><span>N</span><span>＋</span>
          </div>
          <p><strong>1,284</strong> 件の旅のしおりを公開中</p>
        </div>
      </div>

      <div class="hero-postcard" aria-label="注目のしおり">
        <div class="postcard-top">
          <span>FEATURED SHIORI</span>
          <span>KYOTO · 03 DAYS</span>
        </div>
        <div class="postcard-art" aria-hidden="true">
          <span class="postcard-sun"></span>
          <span class="postcard-hill hill-one"></span>
          <span class="postcard-hill hill-two"></span>
          <span class="postcard-temple">京</span>
          <span class="postcard-route">KYOTO → OSAKA</span>
        </div>
        <div class="postcard-copy">
          <div>
            <small>京都府・大阪府</small>
            <h2>朝と余白を味わう、<br />2泊3日の京都</h2>
          </div>
          <a href="/itineraries/kyoto-weekend" aria-label="注目のしおりを見る">↗</a>
        </div>
        <div class="postcard-tape" aria-hidden="true"></div>
      </div>
    </div>
  </section>

  <main>
    <section class="map-section section-wrap" aria-labelledby="map-title">
      <div class="section-heading split-heading">
        <div>
          <p class="section-kicker">CHOOSE A DESTINATION</p>
          <h2 id="map-title">日本地図から探す</h2>
          <p>気になる都道府県をタップして、旅のアイデアを見つけよう。</p>
        </div>
        <span class="section-number" aria-hidden="true">01</span>
      </div>

      <div class="map-layout">
        <JapanMap />
        <aside class="map-note">
          <span class="note-icon" aria-hidden="true">◌</span>
          <p class="note-label">いま注目の旅先</p>
          <h3>京都府</h3>
          <strong>186 <small>しおり</small></strong>
          <p>朝の寺社や、路地裏の喫茶店をめぐるプランが人気です。</p>
          <a href="/area/kyoto">京都府のしおりを見る <span>→</span></a>
        </aside>
      </div>
    </section>

    <section class="popular-section" aria-labelledby="popular-title">
      <div class="section-wrap">
        <div class="section-heading split-heading light-heading">
          <div>
            <p class="section-kicker">POPULAR DESTINATIONS</p>
            <h2 id="popular-title">人気の旅行先</h2>
            <p>次の旅に選ばれている場所から、まずはのぞいてみませんか。</p>
          </div>
          <span class="section-number" aria-hidden="true">02</span>
        </div>

        <div class="destination-grid">
          {#each featured as prefecture, index}
            <a href="/area/{prefecture.slug}" class:wide={index === 0 || index === 3}>
              <span class="destination-index">0{index + 1}</span>
              <div class="destination-symbol" aria-hidden="true">
                {prefecture.shortName.slice(0, 1)}
              </div>
              <div>
                <p>{prefecture.region}</p>
                <h3>{prefecture.name}</h3>
                <strong>{prefecture.count}件 <span>→</span></strong>
              </div>
            </a>
          {/each}
        </div>
      </div>
    </section>

    <section class="latest-section section-wrap" aria-labelledby="latest-title">
      <div class="section-heading split-heading">
        <div>
          <p class="section-kicker">NEW TRAVEL STORIES</p>
          <h2 id="latest-title">新着の公開しおり</h2>
          <p>旅から帰ったばかりの誰かが、思い出と一緒に残したプラン。</p>
        </div>
        <span class="section-number" aria-hidden="true">03</span>
      </div>

      <div class="itinerary-grid">
        {#each publicItineraries.slice(0, 6) as itinerary}
          <ItineraryCard {itinerary} />
        {/each}
      </div>
      <div class="section-action">
        <a href="#prefecture-list">すべての旅先から探す <span>↓</span></a>
      </div>
    </section>

    <section id="prefecture-list" class="directory-section" aria-labelledby="directory-title">
      <div class="section-wrap directory-wrap">
        <div class="directory-copy">
          <p class="section-kicker">ALL 47 PREFECTURES</p>
          <h2 id="directory-title">都道府県一覧</h2>
          <p>地図を使わなくても、地方名や都道府県名から探せます。</p>
          <div class="mini-compass" aria-hidden="true"><span>N</span></div>
        </div>
        <div class="directory-list">
          {#each regions as region}
            <div class="region-row">
              <h3>{region}</h3>
              <div>
                {#each prefectures.filter((prefecture) => prefecture.region === region) as prefecture}
                  <a href="/area/{prefecture.slug}">
                    {prefecture.name}<small>{prefecture.count}</small>
                  </a>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <section class="create-cta">
      <div class="cta-inner">
        <div class="cta-stamp" aria-hidden="true">旅</div>
        <p>YOUR TRIP CAN INSPIRE SOMEONE</p>
        <h2>あなたの旅も、<br />誰かのきっかけに。</h2>
        <span>しおりを作って公開すると、次の旅を探している人に届きます。</span>
        <a href="/#create">無料でしおりを作る <b>→</b></a>
      </div>
    </section>
  </main>

  <PublicFooter />
</div>

<style>
  :global(body) {
    background: #fffdf8;
  }

  .explore-page {
    min-height: 100vh;
    color: #203d3f;
    background: #fffdf8;
    font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif;
  }

  .hero {
    position: relative;
    overflow: hidden;
    padding: 74px 20px 82px;
    background:
      radial-gradient(circle at 8% 12%, rgba(238, 112, 92, 0.11), transparent 25%),
      linear-gradient(180deg, #fffdf8, #fbf7ef);
  }

  .hero-inner {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(390px, 0.82fr);
    align-items: center;
    gap: clamp(50px, 8vw, 110px);
    width: min(1120px, 100%);
    margin: 0 auto;
  }

  .hero-decoration {
    position: absolute;
    border: 1px solid rgba(31, 72, 73, 0.09);
    border-radius: 50%;
  }

  .decoration-one {
    width: 580px;
    height: 580px;
    right: -190px;
    top: -260px;
  }

  .decoration-two {
    width: 360px;
    height: 360px;
    left: -230px;
    bottom: -260px;
  }

  .eyebrow,
  .section-kicker {
    margin: 0 0 15px;
    color: #d85f51;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 0.18em;
  }

  .eyebrow span {
    margin-right: 7px;
  }

  h1 {
    margin: 0;
    color: #173f42;
    font-family: "Hiragino Mincho ProN", "Yu Mincho", serif;
    font-size: clamp(38px, 5vw, 61px);
    font-weight: 700;
    line-height: 1.36;
    letter-spacing: 0.03em;
  }

  h1 em {
    position: relative;
    color: #e06454;
    font-style: normal;
  }

  h1 em::after {
    position: absolute;
    right: -6px;
    bottom: -3px;
    left: -6px;
    height: 8px;
    content: "";
    background: rgba(231, 105, 87, 0.14);
    transform: rotate(-1deg);
  }

  .lead {
    margin: 24px 0 29px;
    color: #637677;
    font-size: 14px;
    line-height: 2;
  }

  .destination-search {
    padding: 9px;
    border: 1px solid #e1e2db;
    border-radius: 18px;
    background: white;
    box-shadow: 0 14px 36px rgba(43, 71, 67, 0.09);
  }

  .destination-search > label {
    display: block;
    margin: 1px 8px 7px;
    color: #849393;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  .search-row {
    display: flex;
    gap: 8px;
  }

  .select-wrap {
    position: relative;
    flex: 1;
  }

  .select-wrap span {
    position: absolute;
    z-index: 1;
    left: 14px;
    top: 50%;
    color: #e06454;
    font-weight: 900;
    pointer-events: none;
    transform: translateY(-50%);
  }

  select {
    width: 100%;
    height: 48px;
    padding: 0 36px;
    border: 0;
    border-radius: 11px;
    color: #385557;
    background: #f7f8f4;
    font-size: 13px;
    font-weight: 700;
    outline: none;
  }

  select:focus {
    box-shadow: inset 0 0 0 2px #9bbdb6;
  }

  .search-row button {
    min-width: 124px;
    border: 0;
    border-radius: 11px;
    color: white;
    background: #173f42;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }

  .search-row button:disabled {
    color: #a2b0ae;
    background: #e9eeea;
    cursor: not-allowed;
  }

  .hero-proof {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 18px;
  }

  .avatar-stack {
    display: flex;
    padding-left: 8px;
  }

  .avatar-stack span {
    display: grid;
    width: 29px;
    height: 29px;
    place-items: center;
    margin-left: -8px;
    border: 2px solid #fffdf8;
    border-radius: 50%;
    color: white;
    background: #5a8c82;
    font-size: 9px;
    font-weight: 800;
  }

  .avatar-stack span:nth-child(2) { background: #d9866f; }
  .avatar-stack span:nth-child(3) { background: #8296b0; }
  .avatar-stack span:nth-child(4) { color: #5d7776; background: #dfeae6; }

  .hero-proof p {
    margin: 0;
    color: #81908f;
    font-size: 10px;
  }

  .hero-proof strong {
    color: #315658;
    font-size: 13px;
  }

  .hero-postcard {
    position: relative;
    padding: 18px 18px 20px;
    border: 1px solid rgba(44, 77, 73, 0.12);
    background: #fffefb;
    box-shadow: 0 28px 60px rgba(48, 75, 70, 0.15);
    transform: rotate(2.2deg);
  }

  .hero-postcard::before {
    position: absolute;
    inset: 7px;
    border: 1px solid rgba(49, 86, 88, 0.08);
    content: "";
    pointer-events: none;
  }

  .postcard-tape {
    position: absolute;
    top: -14px;
    left: 50%;
    width: 94px;
    height: 30px;
    background: rgba(239, 201, 168, 0.68);
    box-shadow: 0 1px 2px rgba(43, 55, 52, 0.05);
    transform: translateX(-50%) rotate(-4deg);
  }

  .postcard-top {
    display: flex;
    justify-content: space-between;
    margin-bottom: 13px;
    color: #879895;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  .postcard-art {
    position: relative;
    height: 286px;
    overflow: hidden;
    background: linear-gradient(155deg, #fde9d6, #f4c3a7 62%, #d98e78);
  }

  .postcard-sun {
    position: absolute;
    top: 40px;
    left: 45px;
    width: 92px;
    height: 92px;
    border-radius: 50%;
    background: rgba(255, 254, 238, 0.82);
    box-shadow: 0 0 0 22px rgba(255, 255, 255, 0.11);
  }

  .postcard-hill {
    position: absolute;
    border-radius: 52% 48% 0 0;
  }

  .hill-one {
    right: -90px;
    bottom: -145px;
    width: 380px;
    height: 320px;
    background: #d47867;
    transform: rotate(-9deg);
  }

  .hill-two {
    left: -100px;
    bottom: -180px;
    width: 390px;
    height: 330px;
    background: rgba(254, 243, 215, 0.58);
    transform: rotate(8deg);
  }

  .postcard-temple {
    position: absolute;
    right: 37px;
    top: 32px;
    display: grid;
    width: 72px;
    height: 72px;
    place-items: center;
    border: 2px solid rgba(255, 255, 255, 0.78);
    border-radius: 50%;
    color: white;
    background: rgba(197, 86, 71, 0.65);
    font-family: serif;
    font-size: 34px;
  }

  .postcard-route {
    position: absolute;
    left: 24px;
    bottom: 20px;
    color: rgba(255, 255, 255, 0.86);
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 0.18em;
  }

  .postcard-copy {
    position: relative;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 20px 5px 3px;
  }

  .postcard-copy small {
    color: #d46152;
    font-size: 9px;
    font-weight: 800;
  }

  .postcard-copy h2 {
    margin: 7px 0 0;
    color: #284b4c;
    font-family: "Hiragino Mincho ProN", "Yu Mincho", serif;
    font-size: 21px;
    line-height: 1.5;
  }

  .postcard-copy > a {
    display: grid;
    width: 42px;
    height: 42px;
    place-items: center;
    border: 1px solid #dbe3de;
    border-radius: 50%;
    color: #315658;
    text-decoration: none;
    transition: 150ms ease;
  }

  .postcard-copy > a:hover {
    color: white;
    background: #315658;
    transform: rotate(-45deg);
  }

  .section-wrap {
    width: min(1120px, calc(100% - 40px));
    margin: 0 auto;
  }

  .map-section,
  .latest-section {
    padding-top: 104px;
    padding-bottom: 110px;
  }

  .section-heading {
    margin-bottom: 36px;
  }

  .split-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 30px;
  }

  .section-heading h2,
  .directory-copy h2,
  .create-cta h2 {
    margin: 0;
    color: #1c4648;
    font-family: "Hiragino Mincho ProN", "Yu Mincho", serif;
    font-size: clamp(27px, 4vw, 39px);
    line-height: 1.4;
  }

  .section-heading > div > p:last-child,
  .directory-copy > p:nth-of-type(2) {
    margin: 9px 0 0;
    color: #788b8a;
    font-size: 12px;
    line-height: 1.7;
  }

  .section-number {
    color: #e5e6df;
    font-family: Georgia, serif;
    font-size: 63px;
    line-height: 0.85;
  }

  .map-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 230px;
    gap: 22px;
    align-items: stretch;
  }

  .map-note {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    overflow: hidden;
    padding: 30px 26px;
    border-radius: 24px;
    color: white;
    background: #e26757;
    box-shadow: 0 18px 42px rgba(196, 84, 67, 0.18);
  }

  .map-note::after {
    position: absolute;
    right: -64px;
    top: -48px;
    width: 170px;
    height: 170px;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    content: "";
  }

  .note-icon {
    position: absolute;
    right: 24px;
    top: 20px;
    color: rgba(255, 255, 255, 0.48);
    font-size: 68px;
    line-height: 1;
  }

  .note-label {
    margin: 0 0 7px;
    color: rgba(255, 255, 255, 0.78);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .map-note h3 {
    margin: 0;
    font-family: "Yu Mincho", serif;
    font-size: 29px;
  }

  .map-note strong {
    margin-top: 4px;
    font-family: Georgia, serif;
    font-size: 42px;
    font-weight: 400;
  }

  .map-note strong small {
    font-family: sans-serif;
    font-size: 10px;
    font-weight: 700;
  }

  .map-note > p:nth-of-type(2) {
    margin: 16px 0 25px;
    color: rgba(255, 255, 255, 0.88);
    font-size: 11px;
    line-height: 1.8;
  }

  .map-note a {
    display: flex;
    justify-content: space-between;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.3);
    color: white;
    text-decoration: none;
    font-size: 10px;
    font-weight: 800;
  }

  .popular-section {
    padding: 102px 0 110px;
    background: #183f42;
  }

  .light-heading h2 { color: white; }
  .light-heading > div > p:last-child { color: #9eb8b5; }
  .light-heading .section-number { color: rgba(255, 255, 255, 0.1); }

  .destination-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .destination-grid a {
    position: relative;
    display: flex;
    min-height: 166px;
    align-items: center;
    gap: 17px;
    overflow: hidden;
    padding: 22px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 18px;
    color: white;
    background: rgba(255, 255, 255, 0.045);
    text-decoration: none;
    transition: 180ms ease;
  }

  .destination-grid a.wide {
    grid-column: span 2;
  }

  .destination-grid a:hover {
    border-color: rgba(255, 255, 255, 0.22);
    background: rgba(255, 255, 255, 0.09);
    transform: translateY(-2px);
  }

  .destination-index {
    position: absolute;
    top: 13px;
    right: 15px;
    color: rgba(255, 255, 255, 0.25);
    font-family: Georgia, serif;
    font-size: 11px;
  }

  .destination-symbol {
    display: grid;
    flex: none;
    width: 72px;
    height: 72px;
    place-items: center;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    color: #ffd6b4;
    background: radial-gradient(circle, rgba(255,255,255,.1), transparent 68%);
    font-family: "Yu Mincho", serif;
    font-size: 28px;
  }

  .destination-grid p {
    margin: 0 0 4px;
    color: #91b1ae;
    font-size: 8px;
    font-weight: 800;
    letter-spacing: 0.1em;
  }

  .destination-grid h3 {
    margin: 0 0 15px;
    font-family: "Yu Mincho", serif;
    font-size: 23px;
  }

  .destination-grid strong {
    color: #d8e5e1;
    font-size: 10px;
  }

  .destination-grid strong span {
    margin-left: 8px;
    color: #ef9586;
  }

  .itinerary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 22px;
  }

  .section-action {
    margin-top: 38px;
    text-align: center;
  }

  .section-action a {
    display: inline-flex;
    gap: 12px;
    padding: 13px 21px;
    border: 1px solid #d6ddd7;
    border-radius: 999px;
    color: #35595a;
    text-decoration: none;
    font-size: 11px;
    font-weight: 800;
  }

  .directory-section {
    padding: 96px 0;
    background: #f1f4ed;
  }

  .directory-wrap {
    display: grid;
    grid-template-columns: 230px minmax(0, 1fr);
    gap: clamp(50px, 8vw, 100px);
  }

  .directory-copy {
    position: relative;
  }

  .mini-compass {
    position: relative;
    display: grid;
    width: 74px;
    height: 74px;
    place-items: center;
    margin-top: 42px;
    border: 1px solid #cbd8d0;
    border-radius: 50%;
    color: #e06758;
    font-family: Georgia, serif;
    font-size: 10px;
  }

  .mini-compass::before,
  .mini-compass::after {
    position: absolute;
    content: "";
    background: #cbd8d0;
  }

  .mini-compass::before { width: 1px; height: 94px; }
  .mini-compass::after { width: 94px; height: 1px; }

  .region-row {
    display: grid;
    grid-template-columns: 100px 1fr;
    gap: 20px;
    padding: 18px 0;
    border-bottom: 1px solid #dbe2da;
  }

  .region-row:first-child {
    padding-top: 0;
  }

  .region-row h3 {
    margin: 5px 0 0;
    color: #1f4a4c;
    font-size: 13px;
    font-weight: 800;
  }

  .region-row > div {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
  }

  .region-row a {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
    padding: 7px 9px;
    border-radius: 7px;
    color: #587070;
    background: rgba(255, 255, 255, 0.62);
    text-decoration: none;
    font-size: 11px;
    font-weight: 700;
  }

  .region-row a:hover {
    color: white;
    background: #e16859;
  }

  .region-row small {
    color: #9aa9a5;
    font-size: 8px;
  }

  .region-row a:hover small { color: rgba(255,255,255,.7); }

  .create-cta {
    padding: 100px 20px;
    text-align: center;
    background:
      radial-gradient(circle at 50% 100%, rgba(221, 106, 87, 0.15), transparent 36%),
      #fffdf8;
  }

  .cta-inner {
    width: min(620px, 100%);
    margin: 0 auto;
  }

  .cta-stamp {
    display: grid;
    width: 56px;
    height: 56px;
    place-items: center;
    margin: 0 auto 24px;
    border: 1px solid #e88c7e;
    border-radius: 50%;
    color: #dd6657;
    font-family: "Yu Mincho", serif;
    font-size: 22px;
  }

  .create-cta p {
    color: #de6859;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.18em;
  }

  .create-cta > .cta-inner > span {
    display: block;
    margin-top: 16px;
    color: #788887;
    font-size: 12px;
    line-height: 1.8;
  }

  .create-cta a {
    display: inline-flex;
    align-items: center;
    gap: 25px;
    margin-top: 30px;
    padding: 15px 22px;
    border-radius: 999px;
    color: white;
    background: #e16859;
    box-shadow: 0 10px 24px rgba(220, 96, 78, 0.2);
    text-decoration: none;
    font-size: 12px;
    font-weight: 800;
  }

  @media (max-width: 900px) {
    .hero-inner {
      grid-template-columns: 1fr;
      max-width: 650px;
    }

    .hero-postcard {
      max-width: 480px;
      margin: 0 auto;
    }

    .map-layout {
      grid-template-columns: 1fr;
    }

    .map-note {
      min-height: 250px;
    }

    .destination-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .destination-grid a.wide {
      grid-column: span 1;
    }

    .itinerary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 680px) {
    .hero {
      padding: 52px 16px 64px;
    }

    h1 {
      font-size: 36px;
    }

    .lead br {
      display: none;
    }

    .destination-search {
      padding: 8px;
    }

    .search-row {
      flex-direction: column;
    }

    .search-row button {
      height: 46px;
    }

    .postcard-art {
      height: 230px;
    }

    .section-wrap {
      width: min(100% - 28px, 1120px);
    }

    .map-section,
    .latest-section,
    .popular-section,
    .directory-section {
      padding-top: 74px;
      padding-bottom: 78px;
    }

    .split-heading {
      align-items: flex-start;
    }

    .section-number {
      font-size: 42px;
    }

    .destination-grid {
      grid-template-columns: 1fr;
    }

    .destination-grid a {
      min-height: 132px;
    }

    .itinerary-grid {
      grid-template-columns: 1fr;
    }

    .directory-wrap {
      grid-template-columns: 1fr;
      gap: 38px;
    }

    .mini-compass {
      display: none;
    }

    .region-row {
      grid-template-columns: 72px 1fr;
      gap: 8px;
    }
  }
</style>
