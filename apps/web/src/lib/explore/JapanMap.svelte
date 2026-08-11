<script lang="ts">
  import { prefectures } from "./data";

  let { activeSlug = "" }: { activeSlug?: string } = $props();
</script>

<div class="map-shell">
  <div class="map-toolbar">
    <p><span aria-hidden="true">⌖</span> 地図から都道府県を選ぶ</p>
    <span class="scroll-hint">横に動かせます →</span>
  </div>
  <div class="map-scroll" aria-label="日本地図。横にスクロールできます">
    <div class="map" role="img" aria-label="47都道府県から選べる日本地図">
      <span class="sea-label sea-label-top" aria-hidden="true">SEA OF JAPAN</span>
      <span class="sea-label sea-label-bottom" aria-hidden="true">PACIFIC OCEAN</span>
      <span class="route-line" aria-hidden="true"></span>
      {#each prefectures as prefecture}
        <a
          href="/area/{prefecture.slug}"
          class="prefecture"
          class:active={prefecture.slug === activeSlug}
          class:popular={prefecture.count >= 85}
          style={`--x:${prefecture.x}%;--y:${prefecture.y}%`}
          aria-label="{prefecture.name}の旅行しおり {prefecture.count}件"
          title="{prefecture.name} · {prefecture.count}件"
        >
          {prefecture.shortName}
        </a>
      {/each}
    </div>
  </div>
  <div class="map-legend">
    <span><i class="dot popular-dot"></i> しおりが多い旅先</span>
    <span><i class="dot"></i> 都道府県を選択</span>
  </div>
</div>

<style>
  .map-shell {
    overflow: hidden;
    border: 1px solid #dfe7df;
    border-radius: 24px;
    background: #f2f7f1;
    box-shadow: 0 18px 50px rgba(38, 75, 68, 0.08);
  }

  .map-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 10px;
  }

  .map-toolbar p {
    margin: 0;
    color: #315658;
    font-size: 12px;
    font-weight: 800;
  }

  .map-toolbar p span {
    margin-right: 5px;
    color: #e56758;
  }

  .scroll-hint {
    display: none;
    color: #7a9391;
    font-size: 10px;
  }

  .map-scroll {
    overflow-x: auto;
    scrollbar-width: thin;
    scrollbar-color: #b6cbc5 transparent;
  }

  .map {
    position: relative;
    width: 100%;
    min-width: 760px;
    height: 430px;
    overflow: hidden;
    background:
      radial-gradient(circle at 72% 30%, rgba(255,255,255,.9) 0 2px, transparent 3px),
      radial-gradient(circle at 25% 72%, rgba(255,255,255,.72) 0 2px, transparent 3px),
      linear-gradient(146deg, #eff6f1, #e4f0ed);
  }

  .map::before,
  .map::after {
    position: absolute;
    content: "";
    border: 1px solid rgba(69, 115, 105, 0.1);
    border-radius: 50%;
  }

  .map::before {
    width: 440px;
    height: 440px;
    right: -120px;
    top: -190px;
  }

  .map::after {
    width: 520px;
    height: 520px;
    left: -190px;
    bottom: -300px;
  }

  .sea-label {
    position: absolute;
    color: rgba(60, 105, 101, 0.25);
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 0.24em;
  }

  .sea-label-top {
    left: 38%;
    top: 19%;
    transform: rotate(-22deg);
  }

  .sea-label-bottom {
    right: 18%;
    bottom: 7%;
    transform: rotate(-12deg);
  }

  .route-line {
    position: absolute;
    left: 7%;
    top: 18%;
    width: 78%;
    height: 66%;
    border-bottom: 1px dashed rgba(67, 115, 107, 0.24);
    border-radius: 50%;
    transform: rotate(-17deg);
  }

  .prefecture {
    position: absolute;
    z-index: 2;
    left: var(--x);
    top: var(--y);
    display: grid;
    width: 42px;
    height: 30px;
    place-items: center;
    border: 1px solid rgba(45, 92, 85, 0.18);
    border-radius: 9px 9px 9px 3px;
    color: #3f6664;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 3px 9px rgba(41, 76, 71, 0.07);
    text-decoration: none;
    font-size: 9px;
    font-weight: 800;
    transform: translate(-50%, -50%);
    transition: 140ms ease;
  }

  .prefecture:hover,
  .prefecture:focus-visible {
    z-index: 4;
    border-color: #e96859;
    color: white;
    background: #e96859;
    outline: none;
    box-shadow: 0 7px 16px rgba(233, 104, 89, 0.27);
    transform: translate(-50%, -50%) scale(1.13);
  }

  .prefecture.popular {
    border-color: rgba(226, 99, 82, 0.34);
    color: #b84c40;
    background: #fff4ec;
  }

  .prefecture.active {
    z-index: 5;
    border-color: #173f42;
    color: white;
    background: #173f42;
    box-shadow: 0 0 0 5px rgba(23, 63, 66, 0.12);
    transform: translate(-50%, -50%) scale(1.12);
  }

  .map-legend {
    display: flex;
    gap: 18px;
    padding: 12px 20px 16px;
    color: #7c8e8e;
    background: rgba(255, 255, 255, 0.45);
    font-size: 9px;
  }

  .map-legend span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border: 1px solid #9ab1ac;
    border-radius: 50%;
    background: white;
  }

  .popular-dot {
    border-color: #e26352;
    background: #fff0e6;
  }

  @media (max-width: 780px) {
    .scroll-hint {
      display: inline;
    }

    .map-scroll {
      scroll-snap-type: x proximity;
    }

    .map {
      min-width: 720px;
      height: 405px;
      scroll-snap-align: start;
    }
  }
</style>
