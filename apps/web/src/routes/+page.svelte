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

  let scrollY = $state(0);
  let heroRef = $state<HTMLElement | null>(null);
  let featuresRef = $state<HTMLElement | null>(null);
  let createRef = $state<HTMLElement | null>(null);
  let featuresVisible = $state(false);
  let createVisible = $state(false);
  let pageReady = $state(false);

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
    pageReady = true;

    recentItineraries = auth.getRecentItineraries();
    showRecent = true;

    const interval = setInterval(() => {
      currentPreview = (currentPreview + 1) % previewItineraries.length;
    }, 3000);

    const handleScroll = () => {
      showScrollButton = window.scrollY > 300;
      scrollY = window.scrollY;
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

  let heroParallax = $derived(scrollY * 0.3);
  let heroOpacity = $derived(Math.max(0, 1 - scrollY / 600));
</script>

<svelte:head>
  <title>たびたび - 旅のしおり作成アプリ</title>
  <meta
    name="description"
    content="たびたびは、旅のしおりをサクッと作成・共有できる無料Webアプリです。友達や家族との旅行計画に。"
  />
  <meta name="theme-color" content="#f9fafb" />
  <meta property="og:title" content="たびたび - 旅のしおり作成アプリ" />
  <meta
    property="og:description"
    content="旅のしおりをサクッと作成・共有できる無料Webアプリ。友達や家族との旅行計画に。"
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tabitabi.pages.dev/" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:site_name" content="たびたび" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="たびたび - 旅のしおり作成アプリ" />
  <meta
    name="twitter:description"
    content="旅のしおりをサクッと作成・共有できる無料Webアプリ。"
  />
  <link rel="canonical" href="https://tabitabi.pages.dev/" />
</svelte:head>

<div class="home-page" class:page-ready={pageReady}>
  {#each flyingAirplanes as id (id)}
    {@const pos = getHeroIconPosition()}
    <FlyingAirplane
      startX={pos.x}
      startY={pos.y}
      onComplete={() => removeAirplane(id)}
    />
  {/each}

  <section
    class="hero"
    bind:this={heroRef}
    style="transform: translateY({heroParallax}px); opacity: {heroOpacity};"
  >
    <div class="hero-bg-decoration">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
      <div class="bg-circle bg-circle-3"></div>
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
    <div class="features-decoration">
      <div class="deco-blob deco-blob-1"></div>
      <div class="deco-blob deco-blob-2"></div>
      <div class="deco-line deco-line-1"></div>
      <div class="deco-line deco-line-2"></div>
    </div>
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
  </section>

  <section
    id="create"
    class="create-section"
    bind:this={createRef}
    class:section-visible={createVisible}
  >
    <div class="create-decoration">
      <div class="create-orb create-orb-1"></div>
      <div class="create-orb create-orb-2"></div>
      <div class="create-orb create-orb-3"></div>
      <div class="grid-pattern"></div>
    </div>
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

  .hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem 1rem;
    position: relative;
    will-change: transform, opacity;
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
    animation: float 20s ease-in-out infinite;
  }

  .bg-circle-1 {
    width: 300px;
    height: 300px;
    top: -100px;
    right: -50px;
    animation-delay: 0s;
  }

  .bg-circle-2 {
    width: 200px;
    height: 200px;
    bottom: 10%;
    left: -80px;
    animation-delay: -7s;
  }

  .bg-circle-3 {
    width: 150px;
    height: 150px;
    top: 40%;
    right: 10%;
    animation-delay: -14s;
  }

  @keyframes float {
    0%,
    100% {
      transform: translate(0, 0) scale(1);
    }
    33% {
      transform: translate(15px, -20px) scale(1.05);
    }
    66% {
      transform: translate(-10px, 10px) scale(0.95);
    }
  }

  .animate-slide-up {
    animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .animate-delay-1 {
    animation-delay: 0.15s;
    opacity: 0;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
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
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
    position: relative;
    overflow: hidden;
  }

  .btn-primary::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      120deg,
      transparent 30%,
      rgba(255, 255, 255, 0.4) 50%,
      transparent 70%
    );
    transform: translateX(-100%);
    transition: transform 0.6s;
  }

  .btn-primary:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
  }

  .btn-primary:hover::after {
    transform: translateX(100%);
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
      #ffffff 0%,
      #f0f7ff 30%,
      #e4f0fd 70%,
      #dbe9ff 100%
    );
    padding: 5rem 1rem 4rem;
    position: relative;
    overflow: hidden;
  }

  .features-decoration {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .deco-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.5;
  }

  .deco-blob-1 {
    width: 400px;
    height: 400px;
    background: linear-gradient(135deg, #93c5fd 0%, #a5b4fc 100%);
    top: -150px;
    right: -100px;
    animation: blobFloat 15s ease-in-out infinite;
  }

  .deco-blob-2 {
    width: 300px;
    height: 300px;
    background: linear-gradient(135deg, #67e8f9 0%, #a5b4fc 100%);
    bottom: -100px;
    left: -80px;
    animation: blobFloat 18s ease-in-out infinite reverse;
  }

  .deco-line {
    position: absolute;
    height: 2px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(147, 197, 253, 0.4),
      transparent
    );
    transform: rotate(-3deg);
  }

  .deco-line-1 {
    width: 60%;
    top: 30%;
    left: 20%;
  }

  .deco-line-2 {
    width: 40%;
    bottom: 25%;
    right: 15%;
    transform: rotate(2deg);
  }

  @keyframes blobFloat {
    0%,
    100% {
      transform: translate(0, 0) scale(1);
    }
    50% {
      transform: translate(30px, -20px) scale(1.1);
    }
  }

  .features::before {
    content: "";
    position: absolute;
    top: -2px;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(145deg, #84c6ff 0%, #a6b3ff 40%, #b5daf8 100%);
    clip-path: polygon(0 0, 100% 0, 100% 20%, 0 100%);
    pointer-events: none;
  }

  .features::after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(135deg, #dbe9ff 0%, #d4e4ff 50%, #e0ecff 100%);
    clip-path: polygon(0 80%, 100% 0, 100% 100%, 0 100%);
    pointer-events: none;
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
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    position: relative;
    z-index: 1;
  }

  .section-visible .section-header {
    opacity: 1;
    transform: translateY(0);
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
    border-radius: 6px;
    background: white;
    border: 2px solid rgba(61, 90, 153, 0.3);
    transition: all 0.2s;
  }

  .docs-link:hover {
    color: #2c3e50;
    background: rgba(107, 140, 206, 0.12);
    border-color: rgba(61, 90, 153, 0.5);
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
    background: white;
    border-radius: 3px;
    padding: 1px;
    color: #3d5a99;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    max-width: 500px;
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
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .section-visible .feature-item {
    opacity: 1;
    transform: translateY(0);
  }

  .feature-delay-0 {
    transition-delay: 0.1s;
  }
  .feature-delay-1 {
    transition-delay: 0.2s;
  }
  .feature-delay-2 {
    transition-delay: 0.3s;
  }
  .feature-delay-3 {
    transition-delay: 0.4s;
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
    background: linear-gradient(
      160deg,
      #dbe9ff 0%,
      #c7dcff 20%,
      #b8d4ff 40%,
      #c4dbff 60%,
      #d8e8ff 80%,
      #e8f2ff 100%
    );
    padding: 5rem 1rem 4rem;
    position: relative;
    overflow: hidden;
  }

  .create-decoration {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .create-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
  }

  .create-orb-1 {
    width: 350px;
    height: 350px;
    background: radial-gradient(
      circle,
      rgba(147, 197, 253, 0.5) 0%,
      transparent 70%
    );
    top: -100px;
    left: -80px;
    animation: orbPulse 10s ease-in-out infinite;
  }

  .create-orb-2 {
    width: 280px;
    height: 280px;
    background: radial-gradient(
      circle,
      rgba(165, 180, 252, 0.4) 0%,
      transparent 70%
    );
    bottom: -80px;
    right: -60px;
    animation: orbPulse 12s ease-in-out infinite 2s;
  }

  .create-orb-3 {
    width: 200px;
    height: 200px;
    background: radial-gradient(
      circle,
      rgba(103, 232, 249, 0.25) 0%,
      transparent 70%
    );
    top: 40%;
    right: 20%;
    animation: orbPulse 8s ease-in-out infinite 4s;
  }

  .grid-pattern {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(
        rgba(147, 197, 253, 0.08) 1px,
        transparent 1px
      ),
      linear-gradient(90deg, rgba(147, 197, 253, 0.08) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse at center, black 30%, transparent 80%);
    -webkit-mask-image: radial-gradient(
      ellipse at center,
      black 30%,
      transparent 80%
    );
  }

  @keyframes orbPulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.15);
      opacity: 0.7;
    }
  }

  .create-section::before {
    content: "";
    position: absolute;
    top: -2px;
    left: 0;
    right: 0;
    height: 80px;
    background: linear-gradient(180deg, #e4f0fd 0%, #dbe9ff 100%);
    clip-path: polygon(0 0, 100% 0, 100% 100%, 0 20%);
    pointer-events: none;
  }

  @media (max-width: 480px) {
    .create-section {
      padding: 3.5rem 1rem 3rem;
    }

    .create-orb-1,
    .create-orb-2,
    .create-orb-3 {
      filter: blur(50px);
    }

    .grid-pattern {
      background-size: 30px 30px;
    }
  }

  .create-container {
    max-width: 480px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .create-form-wrapper {
    opacity: 0;
    transform: translateY(30px) scale(0.98);
    transition: all 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .section-visible .create-form-wrapper {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  .recent-wrapper {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s;
  }

  .section-visible .recent-wrapper {
    opacity: 1;
    transform: translateY(0);
  }

  .home-page {
    opacity: 0;
  }

  .home-page.page-ready {
    animation: fadeIn 0.4s ease-out forwards;
  }

  @keyframes fadeIn {
    to {
      opacity: 1;
    }
  }
</style>
