<script lang="ts">
  // The original three-scene drawing lives in JourneySteps.svelte.
  // These lightweight SVGs continue its story without adding raster image weight.
  const features = [
    { title: "地図で計画", image: "/illustrations/journey-map.svg" },
    { title: "好きなデザインに", image: "/illustrations/journey-design.svg" },
    { title: "持ち物をチェック", image: "/illustrations/journey-packing.svg" },
    { title: "お金を管理", image: "/illustrations/journey-money.svg" },
    { title: "時間までひみつ", image: "/illustrations/journey-secret.svg" },
  ] as const;
</script>

<!-- A single column is intentional at every viewport size: the thread and reading
     order stay intact instead of breaking into cards on desktop or mobile. -->
<ol class="feature-scenes" start="4">
  {#each features as feature (feature.title)}
    <li class="feature-scene">
      <svg class="connecting-thread" viewBox="0 0 840 116" fill="none" aria-hidden="true">
        <path d="M420 0 C409 30 442 42 475 58 C535 88 453 102 420 116" />
      </svg>
      <img
        class="feature-art"
        src={feature.image}
        alt=""
        width="840"
        height="420"
        loading="lazy"
        decoding="async"
      />
      <h3>{feature.title}</h3>
    </li>
  {/each}
</ol>

<style>
  .feature-scenes {
    display: block;
    width: min(100%, 760px);
    margin: 0 auto;
    padding: 0 0 clamp(30px, 6vw, 80px);
    list-style: none;
    color: #282826;
  }

  .feature-scene {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .connecting-thread {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
    flex: none;
  }

  .connecting-thread path {
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
  }

  .feature-art {
    display: block;
    width: 100%;
    max-width: 100%;
    height: auto;
    aspect-ratio: 2 / 1;
    object-fit: contain;
  }

  h3 {
    margin: 0;
    padding: 0 12px;
    font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif;
    font-size: clamp(19px, 3.9vw, 34px);
    font-weight: 300;
    line-height: 1.35;
    letter-spacing: 0.16em;
    text-wrap: balance;
  }

  @media (max-width: 480px) {
    .feature-scenes { padding-bottom: 28px; }
    h3 { font-size: clamp(19px, 5vw, 23px); }
  }
</style>
