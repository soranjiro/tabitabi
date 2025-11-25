<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { itineraryApi } from "$lib/api/itinerary";
  import { auth } from "$lib/auth";
  import { getAvailableThemes } from "$lib/themes";

  let title = $state("");
  let password = $state("");
  let theme_id = $state("standard-autumn");
  let creating = $state(false);
  let titleError = $state("");
  let recentItineraries = $state<
    Array<{ id: string; title: string; visitedAt: number }>
  >([]);
  let showRecent = $state(false);
  let activeTab = $state<"create" | "add">("create");
  let url = $state("");
  let urlError = $state("");
  let currentPreview = $state(0);
  let showScrollButton = $state(false);

  const themes = getAvailableThemes();

  const previewItineraries = [
    {
      title: "沖縄旅行 2025",
      theme: "tropical",
      steps: [
        { time: "10:00", label: "那覇空港到着", icon: "✈️" },
        { time: "12:00", label: "国際通りランチ", icon: "🍜" },
        { time: "15:00", label: "美ら海水族館", icon: "🐠" },
        { time: "18:00", label: "サンセットビーチ", icon: "🌅" },
      ],
    },
    {
      title: "京都日帰り",
      theme: "autumn",
      steps: [
        { time: "08:00", label: "京都駅集合", icon: "🚃" },
        { time: "09:30", label: "清水寺", icon: "⛩️" },
        { time: "12:00", label: "祇園でランチ", icon: "🍱" },
        { time: "14:00", label: "金閣寺", icon: "✨" },
      ],
    },
    {
      title: "北海道グルメ旅",
      theme: "winter",
      steps: [
        { time: "11:00", label: "新千歳空港", icon: "❄️" },
        { time: "13:00", label: "味噌ラーメン", icon: "🍜" },
        { time: "15:00", label: "白い恋人パーク", icon: "🍪" },
        { time: "18:00", label: "ジンギスカン", icon: "🥩" },
      ],
    },
  ];

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

  async function createItinerary() {
    titleError = "";

    if (!title.trim()) {
      titleError = "タイトルを入力してください";
      return;
    }

    creating = true;
    try {
      const created = await itineraryApi.create({
        title: title.trim(),
        theme_id,
        password: password.trim() || undefined,
      });

      if (created.token) {
        auth.setToken(created.id, created.title, created.token);
      }

      goto(`/${created.id}`);
    } catch (error) {
      console.error("Failed to create:", error);
      alert("しおりの作成に失敗しました");
    } finally {
      creating = false;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter" && !creating) {
      createItinerary();
    }
  }

  function removeRecent(id: string) {
    auth.removeFromHistory(id);
    recentItineraries = auth.getRecentItineraries();
  }

  function handleUrlSubmit() {
    urlError = "";

    if (!url.trim()) {
      urlError = "URLを入力してください";
      return;
    }

    try {
      const urlObj = new URL(url.trim(), window.location.origin);

      if (urlObj.origin !== window.location.origin) {
        urlError = "このサイトのURLを入力してください";
        return;
      }

      const pathname = urlObj.pathname;

      // Extract ID from pathname (format: /[id] or /[id]/...)
      const match = pathname.match(/^\/([a-zA-Z0-9_-]+)/);

      if (!match) {
        urlError = "無効なURLです";
        return;
      }

      const id = match[1];
      const token = urlObj.searchParams.get("token");

      // Navigate to the itinerary
      if (token) {
        goto(`/${id}?token=${token}`);
      } else {
        goto(`/${id}`);
      }
    } catch (error) {
      urlError = "無効なURLです";
    }
  }

  function handleUrlKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter") {
      handleUrlSubmit();
    }
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
  <!-- Hero Section -->
  <section class="hero">
    <div class="hero-main">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="hero-icon">
            <svg viewBox="0 0 24 24" fill="currentColor" width="44" height="44">
              <path
                d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
              />
            </svg>
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

      <!-- Preview Carousel -->
      <div class="hero-visual">
        <div class="preview-carousel">
          {#each previewItineraries as preview, i}
            <div
              class="preview-card {i === currentPreview
                ? 'active'
                : i === (currentPreview + 1) % previewItineraries.length
                  ? 'next'
                  : 'prev'}"
            >
              <div class="preview-header">
                <span class="preview-dot red"></span>
                <span class="preview-dot yellow"></span>
                <span class="preview-dot green"></span>
              </div>
              <div class="preview-content">
                <div class="preview-title">{preview.title}</div>
                <div class="preview-timeline">
                  {#each preview.steps as step, j}
                    <div class="preview-step {j === 2 ? 'active' : ''}">
                      <span class="preview-time">{step.time}</span>
                      <span class="preview-icon">{step.icon}</span>
                      <span class="preview-label">{step.label}</span>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/each}
        </div>
        <div class="preview-dots">
          {#each previewItineraries as _, i}
            <button
              class="dot {i === currentPreview ? 'active' : ''}"
              onclick={() => (currentPreview = i)}
              aria-label="プレビュー {i + 1}"
            ></button>
          {/each}
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section id="features" class="features">
    <h2 class="section-title">シンプルに、便利に</h2>
    <div class="features-grid">
      <div class="feature-card">
        <div class="feature-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="32"
            height="32"
          >
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12" y2="18" />
          </svg>
        </div>
        <h3>スマホ最適化</h3>
        <p>どこでも旅程を確認。アプリ不要</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="32"
            height="32"
          >
            <path
              d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
            />
            <path
              d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
            />
          </svg>
        </div>
        <h3>URL共有</h3>
        <p>リンク1つで仲間と共有</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="32"
            height="32"
          >
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <path
              d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"
            />
          </svg>
        </div>
        <h3>テーマ選択</h3>
        <p>シーンに合ったデザイン</p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="32"
            height="32"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <h3>軽量・高速</h3>
        <p>表示まで1秒。ストレスゼロ</p>
      </div>
    </div>
  </section>

  <!-- Create Form Section -->
  <section id="create" class="create-section">
    <div class="create-container">
      <div class="form-card">
        <div class="tab-bar">
          <button
            onclick={() => (activeTab = "create")}
            class="tab-btn {activeTab === 'create' ? 'active' : ''}"
          >
            作成
          </button>
          <button
            onclick={() => (activeTab = "add")}
            class="tab-btn {activeTab === 'add' ? 'active' : ''}"
          >
            URL入力
          </button>
        </div>

        {#if activeTab === "create"}
          <div class="form-body">
            <div class="form-group">
              <label for="title" class="form-label">
                タイトル <span class="required">*</span>
              </label>
              <input
                id="title"
                type="text"
                bind:value={title}
                onkeypress={handleKeyPress}
                placeholder="例: 沖縄旅行 2025"
                class="form-input {titleError ? 'error' : ''}"
              />
              {#if titleError}
                <p class="form-error">{titleError}</p>
              {/if}
            </div>

            <div class="form-group">
              <label for="theme" class="form-label">テーマ</label>
              <select id="theme" bind:value={theme_id} class="form-select">
                {#each themes as theme}
                  <option value={theme.id}>{theme.name}</option>
                {/each}
              </select>
            </div>

            <details class="advanced-options">
              <summary>詳細設定</summary>
              <div class="form-group">
                <label for="password" class="form-label">編集用パスワード</label
                >
                <input
                  id="password"
                  type="password"
                  bind:value={password}
                  placeholder="任意"
                  class="form-input"
                />
                <p class="form-hint">
                  設定するとパスワードなしでは編集できません
                </p>
              </div>
            </details>

            <button
              onclick={createItinerary}
              disabled={creating}
              class="btn-submit"
            >
              {creating ? "作成中..." : "しおりを作成 →"}
            </button>
          </div>
        {:else}
          <div class="form-body">
            <p class="form-description">共有されたしおりのURLを貼り付け</p>
            <div class="form-group">
              <label for="url" class="form-label">
                しおりのURL <span class="required">*</span>
              </label>
              <input
                id="url"
                type="text"
                bind:value={url}
                onkeypress={handleUrlKeyPress}
                placeholder="https://tabitabi.pages.dev/..."
                class="form-input {urlError ? 'error' : ''}"
              />
              {#if urlError}
                <p class="form-error">{urlError}</p>
              {/if}
            </div>

            <button onclick={handleUrlSubmit} class="btn-submit">
              開く →
            </button>
          </div>
        {/if}
      </div>

      {#if showRecent && recentItineraries.length > 0}
        <div class="recent-section">
          <h3 class="recent-title">最近のしおり</h3>
          <div class="recent-list">
            {#each recentItineraries as item}
              <div class="recent-item">
                <button onclick={() => goto(`/${item.id}`)} class="recent-link">
                  <span class="recent-name">{item.title}</span>
                  <span class="recent-date">
                    {new Date(item.visitedAt).toLocaleDateString("ja-JP", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </button>
                <button
                  type="button"
                  onclick={() => removeRecent(item.id)}
                  class="recent-remove"
                  aria-label="削除"
                >
                  ×
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </section>

  <!-- Footer -->
  <footer class="footer">
    <div class="footer-content">
      <div class="footer-links">
        <a
          href="https://github.com/soranjiro/tabitabi/tree/main/docs/features/README.md"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            width="18"
            height="18"
          >
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          ドキュメント
        </a>
        <a
          href="https://github.com/soranjiro/tabitabi"
          target="_blank"
          rel="noopener noreferrer"
          class="footer-link"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path
              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
            />
          </svg>
          GitHub
        </a>
      </div>
      <p class="footer-copy">たびたび - 旅をもっと楽しく</p>
    </div>
  </footer>

  <!-- Scroll to top button -->
  {#if showScrollButton}
    <button onclick={scrollToTop} class="scroll-top-btn">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        width="20"
        height="20"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      しおりを作成
    </button>
  {/if}
</div>

<style>
  .home-page {
    min-height: 100vh;
    background: linear-gradient(145deg, #6b8cce 0%, #8b7dc9 40%, #a78bca 100%);
  }

  /* Hero Section */
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

  .hero-icon svg {
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

  /* Preview Carousel */
  .hero-visual {
    position: relative;
    width: 280px;
    height: 320px;
  }

  .preview-carousel {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .preview-card {
    position: absolute;
    top: 0;
    left: 0;
    background: white;
    border-radius: 16px;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
    width: 260px;
    opacity: 0;
    transform: translateX(40px) scale(0.9);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
  }

  .preview-card.active {
    opacity: 1;
    transform: translateX(0) scale(1);
    pointer-events: auto;
    z-index: 3;
  }

  .preview-card.next {
    opacity: 0.5;
    transform: translateX(30px) translateY(20px) scale(0.92);
    z-index: 2;
  }

  .preview-card.prev {
    opacity: 0;
    transform: translateX(-40px) scale(0.9);
    z-index: 1;
  }

  .preview-header {
    background: #f3f4f6;
    padding: 0.6rem 0.75rem;
    border-radius: 16px 16px 0 0;
    display: flex;
    gap: 0.4rem;
  }

  .preview-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .preview-dot.red {
    background: #ef4444;
  }
  .preview-dot.yellow {
    background: #eab308;
  }
  .preview-dot.green {
    background: #22c55e;
  }

  .preview-content {
    padding: 1rem;
  }

  .preview-title {
    font-size: 1rem;
    font-weight: 700;
    color: #374151;
    margin-bottom: 0.75rem;
  }

  .preview-timeline {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .preview-step {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    background: #f9fafb;
    font-size: 0.85rem;
  }

  .preview-step.active {
    background: linear-gradient(135deg, #6b8cce20, #8b7dc920);
    border-left: 3px solid #6b8cce;
  }

  .preview-time {
    font-size: 0.7rem;
    font-weight: 600;
    color: #9ca3af;
    min-width: 36px;
  }

  .preview-icon {
    font-size: 0.9rem;
  }

  .preview-label {
    color: #374151;
    font-size: 0.8rem;
  }

  .preview-dots {
    position: absolute;
    bottom: -1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
  }

  .dot.active {
    background: white;
    transform: scale(1.2);
  }

  /* Features Section */
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

  .feature-card {
    text-align: center;
    padding: 1.25rem 0.75rem;
    border-radius: 12px;
  }

  .feature-icon {
    margin-bottom: 0.75rem;
    color: #6b8cce;
    transition: transform 0.3s;
  }

  .feature-card:hover .feature-icon {
    transform: scale(1.1);
  }

  .feature-card:hover .feature-icon svg {
    animation: iconBounce 0.5s ease;
  }

  @keyframes iconBounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-4px);
    }
  }

  .feature-icon svg {
    display: block;
    margin: 0 auto;
  }

  .feature-card h3 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #374151;
    margin-bottom: 0.4rem;
  }

  .feature-card p {
    font-size: 0.75rem;
    color: #6b7280;
    line-height: 1.4;
  }

  /* Footer */
  .footer {
    background: #1f2937;
    color: white;
    padding: 1.5rem 1rem;
  }

  .footer-content {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
  }

  .footer-links {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 0.75rem;
  }

  .footer-link {
    color: #9ca3af;
    text-decoration: none;
    font-size: 0.8rem;
    transition: color 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .footer-link svg {
    flex-shrink: 0;
  }

  .footer-link:hover {
    color: white;
  }

  .footer-copy {
    color: #6b7280;
    font-size: 0.7rem;
  }

  /* Create Section */
  .create-section {
    background: #f9fafb;
    padding: 4rem 1rem;
  }

  .create-container {
    max-width: 480px;
    margin: 0 auto;
  }

  .form-card {
    background: white;
    border-radius: 20px;
    box-shadow:
      0 20px 60px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(0, 0, 0, 0.05);
    overflow: hidden;
  }

  .tab-bar {
    display: flex;
    border-bottom: 1px solid #e5e7eb;
  }

  .tab-btn {
    flex: 1;
    padding: 1rem;
    background: none;
    border: none;
    font-size: 1rem;
    font-weight: 600;
    color: #9ca3af;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .tab-btn.active {
    color: #6b8cce;
  }

  .tab-btn.active::after {
    content: "";
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 3px;
    background: #6b8cce;
    border-radius: 3px 3px 0 0;
  }

  .form-body {
    padding: 1.5rem;
  }

  .form-description {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 1rem;
    text-align: center;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .required {
    color: #ef4444;
  }

  .form-input,
  .form-select {
    width: 100%;
    padding: 0.875rem 1rem;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 1rem;
    transition: all 0.2s;
    box-sizing: border-box;
  }

  .form-input:focus,
  .form-select:focus {
    outline: none;
    border-color: #6b8cce;
    box-shadow: 0 0 0 3px rgba(107, 140, 206, 0.15);
  }

  .form-input.error {
    border-color: #ef4444;
  }

  .form-error {
    color: #ef4444;
    font-size: 0.8rem;
    margin-top: 0.5rem;
  }

  .form-hint {
    color: #9ca3af;
    font-size: 0.75rem;
    margin-top: 0.5rem;
  }

  .advanced-options {
    margin-bottom: 1.25rem;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
  }

  .advanced-options summary {
    padding: 0.875rem 1rem;
    cursor: pointer;
    font-size: 0.875rem;
    color: #6b7280;
    background: #f9fafb;
  }

  .advanced-options[open] summary {
    border-bottom: 1px solid #e5e7eb;
  }

  .advanced-options .form-group {
    padding: 1rem;
    margin-bottom: 0;
  }

  .btn-submit {
    width: 100%;
    background: linear-gradient(135deg, #6b8cce, #8b7dc9);
    color: white;
    font-size: 1.125rem;
    font-weight: 700;
    padding: 1rem;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(107, 140, 206, 0.4);
  }

  .btn-submit:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  /* Recent Section */
  .recent-section {
    margin-top: 2rem;
  }

  .recent-title {
    font-size: 1rem;
    font-weight: 700;
    color: #374151;
    margin-bottom: 0.75rem;
  }

  .recent-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .recent-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .recent-link {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .recent-link:hover {
    border-color: #6b8cce;
    background: rgba(107, 140, 206, 0.05);
  }

  .recent-name {
    font-weight: 600;
    color: #374151;
    font-size: 0.9rem;
  }

  .recent-date {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .recent-remove {
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    color: #9ca3af;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    font-size: 1rem;
  }

  .recent-remove:hover {
    background: #fef2f2;
    color: #ef4444;
  }

  /* Scroll to top button */
  .scroll-top-btn {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    background: linear-gradient(135deg, #6b8cce, #8b7dc9);
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    padding: 0.75rem 1.25rem;
    border: none;
    border-radius: 9999px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(107, 140, 206, 0.4);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    z-index: 100;
    animation: fadeIn 0.3s ease;
  }

  .scroll-top-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(107, 140, 206, 0.5);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
