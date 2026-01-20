<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "$lib/auth";
  import { resetDemoMode } from "$lib/demo";
  import {
    PreviewCarousel,
    FeatureCard,
    CreateForm,
    RecentItineraries,
    RecentItinerariesCompact,
    DemoThemeSelector,
    Footer,
    ScrollTopButton,
    FlyingAirplane,
    RotatingText,
    previewItineraries,
  } from "./home";
  import {
    IconAirplane,
    IconPhone,
    IconLink,
    IconPalette,
    IconBolt,
    IconBook,
    IconExternalLink,
  } from "./home/icons";

  let recentItineraries = $state<
    Array<{ id: string; title: string; visitedAt: number }>
  >([]);
  let showRecent = $state(false);
  let showScrollButton = $state(false);
  let showDemoSelector = $state(false);
  let currentPreview = $state(0);

  let flyingAirplanes = $state<number[]>([]);
  let airplaneIdCounter = 0;
  let heroIconRef = $state<HTMLButtonElement | null>(null);
  let isFlying = $derived(flyingAirplanes.length > 0);

  let featuresRef = $state<HTMLElement | null>(null);
  let createRef = $state<HTMLElement | null>(null);
  let featuresVisible = $state(false);
  let createVisible = $state(false);
  let heroHidden = $state(false);

  function spawnFlyingAirplane() {
    if (!heroIconRef || isFlying) return;

    const id = airplaneIdCounter++;
    flyingAirplanes = [...flyingAirplanes, id];
  }

  function removeAirplane(id: number) {
    flyingAirplanes = flyingAirplanes.filter((a) => a !== id);
  }

  function getHeroIconPosition(): { x: number; y: number } {
    if (!heroIconRef) return { x: 10, y: 30 };
    const rect = heroIconRef.getBoundingClientRect();
    return {
      x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
      y: ((rect.top + rect.height / 2) / window.innerHeight) * 100,
    };
  }

  onMount(() => {
    resetDemoMode();

    recentItineraries = auth.getRecentItineraries();
    showRecent = true;

    const interval = setInterval(() => {
      currentPreview = (currentPreview + 1) % previewItineraries.length;
    }, 3000);

    const handleScroll = () => {
      showScrollButton = window.scrollY > 300;
      heroHidden = window.scrollY > 400;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });

    const observerOptions = {
      threshold: 0.15,
      rootMargin: "0px 0px -50px 0px",
    };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.target === featuresRef && entry.isIntersecting) {
          featuresVisible = true;
        }
        if (entry.target === createRef && entry.isIntersecting) {
          createVisible = true;
        }
      });
    }, observerOptions);

    if (featuresRef) observer.observe(featuresRef);
    if (createRef) observer.observe(createRef);

    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  });

  function scrollToCreate() {
    document.getElementById("create")?.scrollIntoView({ behavior: "smooth" });
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeRecent(id: string) {
    auth.removeFromHistory(id);
    recentItineraries = auth.getRecentItineraries();
  }
</script>

<svelte:head>
  <title>たびたび - 旅のしおり作成アプリ</title>
</svelte:head>

<div class="home-page">
  {#each flyingAirplanes as id (id)}
    {@const pos = getHeroIconPosition()}
    <FlyingAirplane
      startX={pos.x}
      startY={pos.y}
      onComplete={() => removeAirplane(id)}
    />
  {/each}

  <section class="hero" class:hero-hidden={heroHidden}>
    <div class="hero-bg-decoration">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
    </div>

    <div class="hero-main">
      <div class="hero-content animate-slide-up">
        <h1 class="hero-title">
          <button
            class="hero-icon"
            class:hero-icon-hidden={isFlying}
            bind:this={heroIconRef}
            onclick={spawnFlyingAirplane}
            aria-label="飛行機を飛ばす"
          >
            <IconAirplane size={44} />
          </button>
          たびたび
        </h1>
        <p class="hero-subtitle">
          <RotatingText currentIndex={currentPreview} />を、サクッと作成
        </p>

        <div class="hero-cta">
          <button onclick={scrollToCreate} class="btn-primary">
            無料でしおりを作成
          </button>
        </div>

        <div class="hero-recent">
          {#if showRecent && recentItineraries.length > 0}
            <RecentItinerariesCompact
              items={recentItineraries}
              onShowMore={scrollToCreate}
            />
          {/if}
        </div>
      </div>

      <div class="hero-preview animate-slide-up animate-delay-1">
        <PreviewCarousel
          previews={previewItineraries}
          currentIndex={currentPreview}
          onSelect={(i) => (currentPreview = i)}
          onTryDemo={() => (showDemoSelector = true)}
        />
      </div>
    </div>
  </section>

  <section
    id="features"
    class="features"
    bind:this={featuresRef}
    class:section-visible={featuresVisible}
  >
    <div class="section-inner">
      <div class="section-header">
        <h2 class="section-title">シンプルに、便利に</h2>
        <a href="/docs/index" class="docs-link" title="ドキュメントを見る">
          <span class="docs-icon-wrapper">
            <IconBook size={30} />
            <span class="external-badge">
              <IconExternalLink size={18} />
            </span>
          </span>
        </a>
      </div>
      <div class="features-grid">
        <div class="feature-item feature-delay-0">
          <FeatureCard
            title="スマホ最適化"
            description="どこでも旅程を確認{'\n'}アプリ不要"
          >
            {#snippet icon()}
              <IconPhone size={32} />
            {/snippet}
          </FeatureCard>
        </div>
        <div class="feature-item feature-delay-1">
          <FeatureCard
            title="URL共有"
            description="リンク1つで仲間と共有{'\n'}ユーザ登録不要"
          >
            {#snippet icon()}
              <IconLink size={32} />
            {/snippet}
          </FeatureCard>
        </div>
        <div class="feature-item feature-delay-2">
          <FeatureCard
            title="テーマ選択"
            description="シーンに合ったデザイン{'\n'}カスタマイズ自在"
          >
            {#snippet icon()}
              <IconPalette size={32} />
            {/snippet}
          </FeatureCard>
        </div>
        <div class="feature-item feature-delay-3">
          <FeatureCard
            title="軽量・高速"
            description="表示まで1秒{'\n'}ストレスゼロ"
          >
            {#snippet icon()}
              <IconBolt size={32} />
            {/snippet}
          </FeatureCard>
        </div>
      </div>
    </div>
  </section>

  <section
    id="create"
    class="create-section"
    bind:this={createRef}
    class:section-visible={createVisible}
  >
    <div class="section-inner">
      <div class="create-container">
        <div class="create-form-wrapper">
          <CreateForm />
        </div>

        {#if showRecent}
          <div class="recent-wrapper">
            <RecentItineraries
              items={recentItineraries}
              onRemove={removeRecent}
            />
          </div>
        {/if}
      </div>
    </div>
  </section>

  <Footer />

  <ScrollTopButton visible={showScrollButton} onclick={scrollToTop} />

  <DemoThemeSelector
    open={showDemoSelector}
    onClose={() => (showDemoSelector = false)}
  />
</div>

<style>
  .home-page {
    min-height: 100vh;
    background: linear-gradient(145deg, #84c6ff 0%, #a6b3ff 40%, #b5daf8 100%);
    overflow-x: hidden;
  }

  .section-inner {
    max-width: 980px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    position: relative;
    transition: opacity 0.3s ease-out;
  }

  .hero.hero-hidden {
    opacity: 0;
    pointer-events: none;
  }

  .hero-bg-decoration {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .bg-circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
  }

  .bg-circle-1 {
    width: 300px;
    height: 300px;
    top: -100px;
    right: -50px;
  }

  .bg-circle-2 {
    width: 200px;
    height: 200px;
    bottom: 10%;
    left: -80px;
  }

  .animate-slide-up {
    animation: slideUp 0.5s ease-out forwards;
  }

  .animate-delay-1 {
    animation-delay: 0.1s;
    opacity: 0;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 480px) {
    .hero {
      padding: 1rem 1rem;
      height: 100vh;
    }
  }

  .hero-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    max-width: 1100px;
    width: 100%;
    height: 100%;
    justify-content: center;
    position: relative;
    z-index: 1;
  }

  @media (min-width: 900px) {
    .hero-main {
      flex-direction: row;
      justify-content: space-between;
      height: 100%;
    }
  }

  .hero-content {
    color: white;
    max-width: 420px;
    text-align: center;
    width: 100%;
  }

  @media (max-width: 480px) {
    .hero-content {
      max-width: 100%;
    }
  }

  .hero-title {
    font-size: 3rem;
    font-weight: 900;
    color: white;
    margin-bottom: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  }

  @media (max-width: 480px) {
    .hero-title {
      font-size: 2.5rem;
      gap: 0.3rem;
      margin-bottom: 0.5rem;
    }
  }

  @media (max-height: 700px) {
    .hero-title {
      margin-top: 0.5rem;
      margin-bottom: 0.3rem;
    }
  }

  @media (min-width: 900px) {
    .hero-title {
      font-size: 3.5rem;
    }
  }

  .hero-icon {
    color: white;
    display: flex;
    align-items: center;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    transition:
      transform 0.2s,
      opacity 0.2s;
  }

  .hero-icon-hidden {
    opacity: 0;
    pointer-events: none;
  }

  .hero-icon:hover {
    transform: scale(1.1);
  }

  .hero-icon:active {
    transform: scale(0.95);
  }

  .hero-icon :global(svg) {
    transform: rotate(-45deg);
    filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.2));
  }

  .hero-subtitle {
    font-size: 1.2rem;
    opacity: 0.95;
    margin-right: 0.5rem;
    margin-bottom: 0.5rem;
    font-weight: 500;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  }

  @media (max-width: 480px) {
    .hero-subtitle {
      font-size: 1.1rem;
      margin-bottom: 1rem;
    }
  }

  @media (max-height: 700px) {
    .hero-subtitle {
      margin-bottom: 0.6rem;
    }
  }

  .hero-cta {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
    margin: auto;
  }

  .btn-primary {
    background: white;
    color: #3d5a99;
    font-size: 1.05rem;
    font-weight: 700;
    padding: 1rem 2.25rem;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  }

  .hero-recent {
    display: none;
  }

  @media (min-height: 700px) {
    .hero-recent {
      display: block;
    }
  }

  .features {
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.92) 0%,
      #f7fbff 35%,
      #f3f7ff 100%
    );
    padding: 4.5rem 1rem 3.75rem;
    position: relative;
    overflow: hidden;
    border-top: 1px solid rgba(255, 255, 255, 0.55);
  }

  @media (max-width: 480px) {
    .features {
      padding: 3.5rem 1rem 3rem;
    }
  }

  .section-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 2.5rem;
    opacity: 1;
    transform: translateY(0);
    transition:
      opacity 0.4s ease-out,
      transform 0.4s ease-out;
    position: relative;
    z-index: 1;
  }

  @media (min-width: 769px) {
    .section-header {
      opacity: 0;
      transform: translateY(15px);
    }

    .section-visible .section-header {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 480px) {
    .section-header {
      margin-bottom: 1.5rem;
    }
  }

  .section-title {
    text-align: center;
    font-size: 1.75rem;
    font-weight: 800;
    color: #374151;
    margin: 0;
    letter-spacing: 0.02em;
  }

  @media (max-width: 480px) {
    .section-title {
      font-size: 1.4rem;
    }
  }

  .docs-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #3d5a99;
    padding: 0.375rem;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(61, 90, 153, 0.2);
    transition:
      transform 0.12s ease,
      background 0.12s ease,
      border-color 0.12s ease;
  }

  .docs-link:hover {
    color: #2c3e50;
    background: rgba(255, 255, 255, 1);
    border-color: rgba(61, 90, 153, 0.35);
    transform: translateY(-1px);
  }

  .docs-link:active {
    transform: scale(0.95);
  }

  .docs-icon-wrapper {
    position: relative;
    display: inline-flex;
  }

  .external-badge {
    position: absolute;
    bottom: -3px;
    right: -8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 3px;
    padding: 1px;
    color: #3d5a99;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    max-width: 760px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  @media (min-width: 768px) {
    .features-grid {
      grid-template-columns: repeat(4, 1fr);
      max-width: 700px;
    }
  }

  .feature-item {
    opacity: 1;
    transform: translateY(0);
    transition:
      opacity 0.4s ease-out,
      transform 0.4s ease-out;
  }

  @media (min-width: 769px) {
    .feature-item {
      opacity: 0;
      transform: translateY(20px);
    }

    .section-visible .feature-item {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .feature-delay-0 {
    transition-delay: 0s;
  }
  .feature-delay-1 {
    transition-delay: 0.05s;
  }
  .feature-delay-2 {
    transition-delay: 0.1s;
  }
  .feature-delay-3 {
    transition-delay: 0.15s;
  }

  .hero-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.5rem;
    margin-bottom: 2rem;
    width: 100%;
    max-width: 350px;
  }

  @media (max-width: 480px) {
    .hero-preview {
      margin-bottom: 1rem;
      max-width: 100%;
    }
  }

  .create-section {
    background: #f3f7ff;
    padding: 4.25rem 1rem 4rem;
    position: relative;
    overflow: hidden;
    border-top: 1px solid rgba(61, 90, 153, 0.12);
  }

  @media (max-width: 480px) {
    .create-section {
      padding: 3.5rem 1rem 3rem;
    }
  }

  .create-container {
    max-width: 480px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
    padding: 1.1rem;
  }

  .create-form-wrapper {
    opacity: 1;
    transform: translateY(0);
    transition:
      opacity 0.4s ease-out,
      transform 0.4s ease-out;
  }

  @media (min-width: 769px) {
    .create-form-wrapper {
      opacity: 0;
      transform: translateY(20px);
    }

    .section-visible .create-form-wrapper {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .recent-wrapper {
    opacity: 1;
    transform: translateY(0);
    transition:
      opacity 0.4s ease-out 0.1s,
      transform 0.4s ease-out 0.1s;
  }

  @media (min-width: 769px) {
    .recent-wrapper {
      opacity: 0;
      transform: translateY(15px);
    }

    .section-visible .recent-wrapper {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .animate-slide-up {
      animation: none !important;
    }

    .animate-delay-1 {
      opacity: 1 !important;
    }

    .feature-item,
    .section-header,
    .create-form-wrapper,
    .recent-wrapper {
      transition: none !important;
      transform: none !important;
      opacity: 1 !important;
    }
  }
</style>
