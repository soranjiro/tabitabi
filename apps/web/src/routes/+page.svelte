<script lang="ts">
  import { onMount } from "svelte";
  import { auth } from "$lib/auth";
  import {
    PreviewCarousel,
    FeatureCard,
    CreateForm,
    RecentItineraries,
    Footer,
    ScrollTopButton,
    previewItineraries,
  } from "./home";
  import {
    IconAirplane,
    IconPhone,
    IconLink,
    IconPalette,
    IconBolt,
  } from "./home/icons";

  let recentItineraries = $state<
    Array<{ id: string; title: string; visitedAt: number }>
  >([]);
  let showRecent = $state(false);
  let currentPreview = $state(0);
  let showScrollButton = $state(false);

  onMount(() => {
    setTimeout(() => {
      recentItineraries = auth.getRecentItineraries();
      showRecent = true;
    }, 300);

    const interval = setInterval(() => {
      currentPreview = (currentPreview + 1) % previewItineraries.length;
    }, 4000);

    const handleScroll = () => {
      showScrollButton = window.scrollY > 300;
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", handleScroll);
    };
  });

  function scrollToCreate() {
    document.getElementById("create")?.scrollIntoView({ behavior: "smooth" });
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToFeatures() {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  }

  function removeRecent(id: string) {
    auth.removeFromHistory(id);
    recentItineraries = auth.getRecentItineraries();
  }
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

<div class="home-page">
  <section class="hero">
    <div class="hero-main">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="hero-icon">
            <IconAirplane size={44} />
          </span>
          たびたび
        </h1>
        <p class="hero-subtitle">旅のしおりを、サクッと作成・共有</p>
        <p class="hero-description">
          友達や家族との旅行計画を、シンプルに美しくまとめよう
        </p>

        <div class="hero-cta">
          <button onclick={scrollToCreate} class="btn-primary">
            無料でしおりを作成
          </button>
          <button onclick={scrollToFeatures} class="btn-secondary">
            機能を見る ↓
          </button>
        </div>
      </div>

      <PreviewCarousel
        previews={previewItineraries}
        currentIndex={currentPreview}
        onSelect={(i) => (currentPreview = i)}
      />
    </div>
  </section>

  <section id="features" class="features">
    <h2 class="section-title">シンプルに、便利に</h2>
    <div class="features-grid">
      <FeatureCard
        title="スマホ最適化"
        description="どこでも旅程を確認。アプリ不要"
      >
        {#snippet icon()}
          <IconPhone size={32} />
        {/snippet}
      </FeatureCard>
      <FeatureCard title="URL共有" description="リンク1つで仲間と共有">
        {#snippet icon()}
          <IconLink size={32} />
        {/snippet}
      </FeatureCard>
      <FeatureCard title="テーマ選択" description="シーンに合ったデザイン">
        {#snippet icon()}
          <IconPalette size={32} />
        {/snippet}
      </FeatureCard>
      <FeatureCard title="軽量・高速" description="表示まで1秒。ストレスゼロ">
        {#snippet icon()}
          <IconBolt size={32} />
        {/snippet}
      </FeatureCard>
    </div>
  </section>

  <section id="create" class="create-section">
    <div class="create-container">
      <CreateForm />

      {#if showRecent}
        <RecentItineraries items={recentItineraries} onRemove={removeRecent} />
      {/if}
    </div>
  </section>

  <Footer />

  <ScrollTopButton visible={showScrollButton} onclick={scrollToTop} />
</div>

<style>
  .home-page {
    min-height: 100vh;
    background: linear-gradient(145deg, #6ba0ce 0%, #8691cf 40%, #9295c9 100%);
  }

  .hero {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
  }

  .hero-main {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
    max-width: 1100px;
    width: 100%;
  }

  @media (min-width: 900px) {
    .hero-main {
      flex-direction: row;
      justify-content: space-between;
      gap: 3rem;
    }
  }

  .hero-content {
    color: white;
    max-width: 420px;
    text-align: center;
  }

  @media (min-width: 900px) {
    .hero-content {
      text-align: left;
    }
  }

  .hero-title {
    font-size: 3rem;
    font-weight: 900;
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  }

  @media (min-width: 900px) {
    .hero-title {
      justify-content: flex-start;
      font-size: 3.5rem;
    }
  }

  .hero-icon {
    color: white;
    display: flex;
    align-items: center;
  }

  .hero-icon :global(svg) {
    transform: rotate(-45deg);
    filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.2));
  }

  .hero-subtitle {
    font-size: 1.1rem;
    opacity: 0.9;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .hero-description {
    font-size: 0.95rem;
    opacity: 0.8;
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .hero-cta {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: center;
  }

  @media (min-width: 900px) {
    .hero-cta {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  .btn-primary {
    background: white;
    color: #6b8cce;
    font-size: 1rem;
    font-weight: 700;
    padding: 0.875rem 2rem;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }

  .btn-secondary {
    color: white;
    font-size: 0.9rem;
    font-weight: 600;
    padding: 0.75rem 1.25rem;
    background: transparent;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.6);
  }

  .features {
    background: white;
    padding: 4rem 1rem;
  }

  .section-title {
    text-align: center;
    font-size: 1.75rem;
    font-weight: 800;
    color: #374151;
    margin-bottom: 2.5rem;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    max-width: 700px;
    margin: 0 auto;
  }

  @media (min-width: 768px) {
    .features-grid {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  .create-section {
    background: #f9fafb;
    padding: 4rem 1rem;
  }

  .create-container {
    max-width: 480px;
    margin: 0 auto;
  }
</style>
