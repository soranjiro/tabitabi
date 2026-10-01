<script lang="ts">
  import { onMount } from "svelte";

  let section = $state<HTMLElement | null>(null);
  let progress = $state(0);

  onMount(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      progress = 1;
      return;
    }

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!section) return;

        const rect = section.getBoundingClientRect();
        const start = window.innerHeight * 0.86;
        const end = -rect.height * 0.08;
        const next = (start - rect.top) / Math.max(1, start - end);
        progress = Math.min(1, Math.max(0, next));
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  });

  const planeOpacity = $derived(Math.min(1, Math.max(0, (progress - 0.34) * 4)));
  const viewOpacity = $derived(Math.min(1, Math.max(0, (progress - 0.62) * 3.2)));
</script>

<section class="journey-section" bind:this={section} aria-labelledby="journey-title">
  <div class="journey-inner">
    <header class="journey-heading">
      <span class="route-mark" aria-hidden="true"><i></i><b></b><i></i></span>
      <h2 id="journey-title">つくって、送って、<br class="mobile-break" />みんなで見る。</h2>
    </header>

    <div class="journey-art-wrap" aria-hidden="true">
      <svg class="journey-art" viewBox="0 0 420 250" role="presentation">
        <g class="line-art create-scene">
          <path d="M23 156c10-19 24-29 42-31 19-2 34 5 43 17" />
          <circle cx="52" cy="95" r="15" />
          <path d="M42 91c4-10 10-15 20-16M39 99c-6 8-8 20-8 31M62 110c7 7 11 15 13 25M41 125l18 16M59 141l20-16" />
          <circle cx="101" cy="91" r="14" />
          <path d="M90 88c4-9 10-14 20-14M88 105c-7 8-10 19-10 34M111 105c7 8 10 18 12 30M87 129l14 11 14-12" />
          <circle cx="145" cy="101" r="14" />
          <path d="M135 96c5-9 11-13 20-12M131 114c-7 8-10 18-10 29M155 114c7 8 10 16 12 26M132 135l14 7 12-11" />
          <path class="map-sheet" d="M71 146l36-8 25 14-38 9-23-15Z" />
          <path d="M81 146l13 6 20-7M92 143l7 15M116 142l6 11" />
        </g>

        <path
          class="story-line"
          pathLength="1"
          stroke-dasharray="1"
          stroke-dashoffset={1 - progress}
          d="M20 164c48 7 74 10 121 3 37-6 48-31 76-22 24 8 24 35 51 35 27 0 33-35 62-33 27 2 33 25 72 13"
        />

        <g class="paper-plane" style:opacity={planeOpacity}>
          <path d="M213 124l31-13-12 28-7-10-12-5Z" />
          <path d="M225 129l19-18" />
        </g>

        <g class="line-art view-scene" style:opacity={viewOpacity}>
          <circle cx="324" cy="99" r="15" />
          <path d="M314 94c4-10 11-15 21-14M310 114c-7 8-10 18-9 31M336 114c7 8 11 17 13 29M311 137l14 6 13-11" />
          <circle cx="369" cy="104" r="14" />
          <path d="M359 100c4-9 11-13 20-12M356 117c-6 7-9 17-9 28M379 117c7 7 10 15 12 25M357 137l13 7 11-12" />
          <rect x="337" y="127" width="28" height="35" rx="4" />
          <path d="M344 136h14M344 143h11M344 150h14" />
          <path class="landscape" d="M344 67c13-15 30-18 51-11M364 66c6-8 13-12 21-11M379 61l8-12 8 12" />
        </g>
      </svg>
    </div>

    <div class="journey-labels" aria-label="たびたびの使い方">
      <div>
        <span>01</span>
        <strong>つくる</strong>
        <small>旅の予定をまとめる。</small>
      </div>
      <div>
        <span>02</span>
        <strong>送る</strong>
        <small>URLで共有する。</small>
      </div>
      <div>
        <span>03</span>
        <strong>見る</strong>
        <small>みんなで確認。</small>
      </div>
    </div>

    <div class="journey-tail" aria-hidden="true">
      <i></i>
      <span>✈</span>
    </div>
  </div>
</section>

<style>
  .journey-section {
    position: relative;
    padding: 104px 20px 94px;
    overflow: hidden;
    background:
      radial-gradient(circle at 12% 32%, rgba(203,225,237,.28) 0 46px, transparent 47px),
      radial-gradient(circle at 88% 58%, rgba(203,225,237,.2) 0 58px, transparent 59px),
      var(--home-paper);
  }

  .journey-inner {
    width: min(900px, 100%);
    margin: 0 auto;
  }

  .journey-heading {
    margin-bottom: 38px;
    text-align: center;
  }

  .route-mark {
    position: relative;
    display: flex;
    width: 112px;
    height: 18px;
    margin: 0 auto 14px;
    align-items: center;
    justify-content: space-between;
  }

  .route-mark::before {
    position: absolute;
    right: 5px;
    left: 5px;
    top: 8px;
    border-top: 2px dashed #aebdca;
    content: "";
  }

  .route-mark i,
  .route-mark b {
    position: relative;
    z-index: 1;
    width: 9px;
    height: 9px;
    border: 2px solid #8fa5b6;
    border-radius: 50%;
    background: var(--home-paper);
  }

  .route-mark b {
    width: 11px;
    height: 11px;
    border-color: var(--home-action);
  }

  h2 {
    margin: 0;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: clamp(30px, 4.1vw, 42px);
    font-weight: 400;
    line-height: 1.45;
    letter-spacing: .045em;
  }

  .mobile-break { display: none; }

  .journey-art-wrap {
    width: min(760px, 100%);
    margin: 0 auto;
  }

  .journey-art {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    color: #2f6590;
  }

  .line-art,
  .story-line,
  .paper-plane {
    fill: none;
    stroke: currentColor;
    stroke-width: 2.15;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .line-art .map-sheet {
    fill: rgba(255,255,255,.55);
  }

  .story-line {
    stroke-width: 2.6;
    transition: stroke-dashoffset 80ms linear;
  }

  .paper-plane,
  .view-scene {
    transition: opacity 180ms ease;
  }

  .journey-labels {
    display: grid;
    width: min(760px, 100%);
    margin: -8px auto 0;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .journey-labels > div {
    display: grid;
    min-width: 0;
    justify-items: center;
    text-align: center;
  }

  .journey-labels span {
    display: grid;
    width: 38px;
    height: 38px;
    margin-bottom: 10px;
    border-radius: 50%;
    place-items: center;
    color: #46657f;
    background: #e7f1f7;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .06em;
  }

  .journey-labels strong {
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: 21px;
    font-weight: 600;
  }

  .journey-labels small {
    margin-top: 6px;
    color: var(--home-muted);
    font-size: 12px;
    line-height: 1.6;
  }

  .journey-tail {
    display: flex;
    width: 114px;
    height: 25px;
    margin: 72px auto -22px;
    align-items: center;
    color: #8fa5b6;
  }

  .journey-tail i {
    flex: 1;
    border-top: 2px dotted currentColor;
  }

  .journey-tail span {
    margin-left: 8px;
    font-size: 17px;
    transform: rotate(8deg);
  }

  @media (max-width: 767px) {
    .journey-section {
      min-height: 78svh;
      padding: 78px 16px 68px;
    }

    .journey-heading {
      margin-bottom: 24px;
    }

    .mobile-break { display: initial; }

    h2 {
      font-size: clamp(28px, 8.2vw, 34px);
      line-height: 1.5;
    }

    .journey-art-wrap {
      width: min(100%, 420px);
      margin-top: 4px;
    }

    .journey-labels {
      width: min(100%, 420px);
      margin-top: -3px;
      gap: 6px;
    }

    .journey-labels span {
      width: 34px;
      height: 34px;
      margin-bottom: 8px;
      font-size: 11px;
    }

    .journey-labels strong {
      font-size: 18px;
    }

    .journey-labels small {
      max-width: 104px;
      font-size: 11px;
      line-height: 1.45;
    }

    .journey-tail {
      margin-top: 56px;
    }
  }

  @media (max-width: 350px) {
    .journey-section {
      padding-inline: 12px;
    }

    .journey-labels strong { font-size: 17px; }
    .journey-labels small { font-size: 10px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .story-line,
    .paper-plane,
    .view-scene {
      transition: none;
    }
  }
</style>
