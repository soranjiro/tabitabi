<script lang="ts">
  import type { PageData } from "./$types";
  import type { ShioriHistory } from "@tabitabi/types";
  import { onMount } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import { auth } from "$lib/auth";
  import { userAuth } from "$lib/user-auth";
  import CreateForm from "./home/CreateForm.svelte";
  import RecentItineraries from "./home/RecentItineraries.svelte";
  import Footer from "./home/Footer.svelte";
  import JourneySteps from "./home/JourneySteps.svelte";
  import IconAirplane from "./home/icons/IconAirplane.svelte";

  const { data }: { data: PageData } = $props();

  type Preview = {
    id: string;
    image: string;
    itineraryId: string;
    title: string;
    duration: string;
    destination: string;
    accent: string;
    imagePosition: string;
    steps: Array<{ time: string; title: string }>;
  };

  const previews: Preview[] = [
    {
      id: "spring",
      image: "/hero/background-spring.avif",
      itineraryId: "official-spring-public",
      title: "春の京都・宇治",
      duration: "2泊3日",
      destination: "京都",
      accent: "#ec858c",
      imagePosition: "center 48%",
      steps: [
        { time: "09:00", title: "清水寺参拝" },
        { time: "12:00", title: "祇園で懐石料理" },
        { time: "13:30", title: "祇園から嵐山へ移動" },
        { time: "15:00", title: "嵐山の桜散策" },
      ],
    },
    {
      id: "summer",
      image: "/hero/background-summer.avif",
      itineraryId: "official-summer-public",
      title: "夏休みの沖縄旅行",
      duration: "2泊3日",
      destination: "沖縄",
      accent: "#3f9ec6",
      imagePosition: "center 52%",
      steps: [
        { time: "10:00", title: "那覇空港到着" },
        { time: "11:15", title: "空港からビーチへ移動" },
        { time: "14:00", title: "ビーチでシュノーケリング" },
        { time: "19:00", title: "恩納村リゾートホテル宿泊" },
      ],
    },
    {
      id: "autumn",
      image: "/hero/background-autumn.avif",
      itineraryId: "official-autumn-public",
      title: "日光・会津 紅葉と温泉",
      duration: "6泊7日",
      destination: "栃木",
      accent: "#c77145",
      imagePosition: "center 48%",
      steps: [
        { time: "09:00", title: "日光東照宮参拝" },
        { time: "12:00", title: "湯滝観瀑" },
        { time: "13:30", title: "湯滝から華厳滝へ移動" },
        { time: "15:00", title: "華厳滝" },
      ],
    },
    {
      id: "winter",
      image: "/hero/background-winter.avif",
      itineraryId: "official-winter-public",
      title: "冬の北海道 湯めぐり18日間",
      duration: "17泊18日",
      destination: "北海道",
      accent: "#7592b7",
      imagePosition: "center 50%",
      steps: [
        { time: "08:00", title: "札幌駅から登別へ移動" },
        { time: "11:30", title: "登別温泉街を散策" },
        { time: "15:00", title: "温泉宿にチェックイン" },
        { time: "19:00", title: "温泉宿で夕食" },
      ],
    },
    {
      id: "plan",
      image: "/itinerary-backgrounds/coastal-drive.avif",
      itineraryId: "official-plan-public",
      title: "紫陽花の鎌倉・江の島",
      duration: "1泊2日",
      destination: "鎌倉・江の島",
      accent: "#668fb2",
      imagePosition: "center 48%",
      steps: [
        { time: "08:30", title: "明月院の紫陽花" },
        { time: "10:15", title: "円覚寺を拝観" },
        { time: "13:30", title: "鶴岡八幡宮を参拝" },
        { time: "16:30", title: "鎌倉駅近くのホテルに宿泊" },
      ],
    },
    {
      id: "map",
      image: "/itinerary-backgrounds/japanese.avif",
      itineraryId: "official-map-public",
      title: "秋の金沢 王道まち歩き",
      duration: "1泊2日",
      destination: "金沢",
      accent: "#a96845",
      imagePosition: "center 52%",
      steps: [
        { time: "09:50", title: "金沢駅に到着" },
        { time: "11:00", title: "近江町市場で海鮮ランチ" },
        { time: "13:00", title: "金沢城公園" },
        { time: "15:00", title: "金沢21世紀美術館" },
      ],
    },
  ];

  const preview = $derived(previews[data.previewIndex] ?? previews[0]!);
  let loggedIn = $state(false);
  let menuOpen = $state(false);
  let scrollProgress = $state(0);
  let heroStage = $state<HTMLElement | null>(null);
  let recentItineraries = $state<Array<{ id: string; title: string; visitedAt: number }>>([]);
  let removedHistoryEntry = $state<ShioriHistory | null>(null);
  let undoTimer: ReturnType<typeof setTimeout> | null = null;

  const heroStyle = $derived(
    `--accent:${preview?.accent ?? "#ec858c"};--paper-y:${Math.round((1 - scrollProgress) * 190)}px;--image-scale:${1 + scrollProgress * 0.045};--content-y:${Math.round(scrollProgress * -32)}px;--content-opacity:${1 - scrollProgress * 0.28}`,
  );

  function refreshLoggedIn() { loggedIn = userAuth.isLoggedIn(); }

  function scrollToCreate() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("create")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  function removeRecent(id: string) {
    removedHistoryEntry = auth.getHistory().find((entry) => entry.shioriId === id) ?? null;
    auth.removeFromHistory(id);
    recentItineraries = auth.getRecentItineraries();

    if (undoTimer) clearTimeout(undoTimer);
    if (removedHistoryEntry) {
      undoTimer = setTimeout(() => {
        removedHistoryEntry = null;
        undoTimer = null;
      }, 6000);
    }
  }

  function restoreRecent() {
    if (!removedHistoryEntry) return;

    auth.restoreHistoryEntry(removedHistoryEntry);
    recentItineraries = auth.getRecentItineraries();
    removedHistoryEntry = null;

    if (undoTimer) {
      clearTimeout(undoTimer);
      undoTimer = null;
    }
  }

  afterNavigate(refreshLoggedIn);
  onMount(() => {
    refreshLoggedIn();
    recentItineraries = auth.getRecentItineraries();
    let frame = 0;
    const updateScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!heroStage) return;
        const travel = Math.max(1, heroStage.offsetHeight - window.innerHeight);
        scrollProgress = Math.min(1, Math.max(0, -heroStage.getBoundingClientRect().top / travel));
      });
    };
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
      if (undoTimer) clearTimeout(undoTimer);
    };
  });
</script>

<svelte:head>
  <title>たびたび - 旅の予定を、ひとつに。</title>
  <link rel="preload" as="image" href={preview.image} fetchpriority="high" />
  <meta name="description" content="旅の予定をひとつにまとめて、URLでかんたん共有。登録不要・無料で使える旅のしおり作成サービスです。" />
  <link rel="canonical" href="https://tabitabi.pages.dev/" />
  <meta property="og:title" content="たびたび - 旅の予定を、ひとつに。" />
  <meta property="og:description" content="つくって、送って、みんなで見る。無料の旅のしおり作成サービス。" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tabitabi.pages.dev/" />
  <meta property="og:image" content="https://tabitabi.pages.dev/og-image.png" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:site_name" content="たびたび" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="home-page">
  <section class="hero-stage" bind:this={heroStage} style={heroStyle}>
    <div class="hero-scene">
      <picture class="hero-picture">
          <img src={preview.image} alt={`${preview.destination}の風景`} fetchpriority="high" decoding="async" style:object-position={preview.imagePosition} />
      </picture>
      <div class="hero-shade"></div>

      <header class="site-header">
        <a class="brand" href="/" aria-label="たびたび ホーム">
          <span class="brand-mark"><IconAirplane size={23} /></span>
          <strong>たびたび</strong>
          <span class="brand-route" aria-hidden="true">
            <svg viewBox="0 0 145 23" role="presentation">
              <path d="M2 11C14 4 24 18 37 11S57 4 66 11c7 6 10 9 15 1 5-8 12-10 17-2 5 8 10 7 15 1 4-5 8-6 15-3" />
              <path d="m132 5 5 3-5 4" />
            </svg>
          </span>
        </a>
        <nav class:open={menuOpen} aria-label="サイトナビゲーション">
          <a href="/explore">みんなのしおり</a>
          <a href="/docs/index">使い方</a>
          <a class="account-link" href="/profile">{loggedIn ? "マイページ" : "ログイン"}</a>
        </nav>
        <button class="menu-button" class:open={menuOpen} onclick={() => (menuOpen = !menuOpen)} aria-label="メニューを開閉" aria-expanded={menuOpen}>{menuOpen ? "×" : "☰"}</button>
      </header>

      <main class="hero-main">
        <div class="hero-copy">
          <h1>旅の予定を、<br />ひとつに。</h1>
          <p>つくって、送って、みんなで見る。</p>
          <div class="hero-actions">
            <button class="primary" onclick={scrollToCreate}>しおりを作る <span aria-hidden="true">→</span></button>
            <a class="text-link" href="/explore">みんなのしおりを見る <span aria-hidden="true">›</span></a>
          </div>
          <ul class="quick-facts" aria-label="サービスの特徴">
            <li><span class="plain-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.6-4 2.8-6.1 6.5-6.1s5.9 2.1 6.5 6.1"/></svg></span>登録不要</li>
            <li><span aria-hidden="true">¥0</span>無料</li>
            <li><span class="plain-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9.5 14.5l5-5"/><path d="M7.2 16.8l-1.1 1.1a3.4 3.4 0 0 1-4.8-4.8l3.1-3.1a3.4 3.4 0 0 1 4.8 0"/><path d="M16.8 7.2l1.1-1.1a3.4 3.4 0 0 1 4.8 4.8L19.6 14a3.4 3.4 0 0 1-4.8 0"/></svg></span>URL共有</li>
          </ul>
        </div>

        <div class="preview-area">
          <a class="shiori-preview" href="/s/{preview.itineraryId}" aria-label="{preview.title}のしおりを開く">
            <picture class="preview-photo">
              <img src={preview.image} alt="" style:object-position={preview.imagePosition} />
            </picture>
            <div class="preview-body">
              <span class="preview-kicker">サンプルのしおり</span>
              <h2>{preview.title}</h2>
              <p>{preview.duration}・{preview.destination}</p>
              <strong class="day-label">Day 1</strong>
              <ol class="preview-timeline">
                {#each preview.steps.slice(0, 3) as step}
                  <li><time>{step.time}</time><span>{step.title}</span></li>
                {/each}
              </ol>
              <div class="preview-more">
                <span>しおりを見る</span>
                <span aria-hidden="true">→</span>
              </div>
            </div>
          </a>
        </div>
      </main>

      <p class="place-label">⌖ {preview.destination}</p>
      <button class="scroll-cue" onclick={scrollToCreate} aria-label="下へスクロール"><span>⌄</span></button>
      <div class="paper-reveal" aria-hidden="true"><i></i><b></b></div>
    </div>
  </section>

  <JourneySteps />

  <section id="create" class="create-section" aria-labelledby="create-title">
    <div class="section-inner">
      <div class="create-heading">
        <span class="tiny-route" aria-hidden="true"><i></i><b>✈</b></span>
        <p>次の旅</p>
        <h2 id="create-title">次の旅を、つくろう。</h2>
      </div>
      <CreateForm />
      {#if recentItineraries.length > 0 || removedHistoryEntry}
        <div class="recent-wrapper">
          <RecentItineraries
            items={recentItineraries}
            onRemove={removeRecent}
            removedTitle={removedHistoryEntry?.title ?? null}
            onRestore={restoreRecent}
          />
        </div>
      {/if}
    </div>
  </section>
  <Footer />
</div>

<style>
  :global(body) {
    margin: 0;
    color: var(--home-ink);
    background: var(--home-paper);
  }

  :global(*) { box-sizing: border-box; }
  :global(html) { scroll-behavior: smooth; }

  .home-page {
    min-height: 100vh;
    overflow-x: clip;
    color: var(--home-ink);
    background: var(--home-paper);
    font-family: var(--home-font-sans);
  }

  .hero-stage {
    position: relative;
    height: 118svh;
    background: #d8e7eb;
  }

  .hero-scene {
    position: sticky;
    top: 0;
    height: 100svh;
    overflow: hidden;
    isolation: isolate;
  }

  .hero-picture,
  .hero-picture img,
  .hero-shade {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .hero-picture {
    z-index: -4;
    transform: scale(var(--image-scale));
    transform-origin: center;
  }

  .hero-picture img { object-fit: cover; }

  .hero-shade {
    z-index: -3;
    background:
      linear-gradient(90deg, rgba(255,255,255,.9) 0%, rgba(255,255,255,.72) 32%, rgba(255,255,255,.14) 62%, rgba(8,25,40,.22) 100%),
      linear-gradient(0deg, rgba(6,24,38,.16), transparent 48%);
  }

  .site-header {
    position: relative;
    z-index: 4;
    display: flex;
    width: min(var(--home-content-wide), calc(100% - 64px));
    height: 82px;
    margin: 0 auto;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: var(--home-ink-strong);
    text-decoration: none;
  }

  .brand-mark {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    border: 1px solid rgba(21,39,61,.22);
    border-radius: 50%;
    color: #24466c;
    background: rgba(255,255,255,.42);
  }

  .brand strong {
    font-family: var(--home-font-serif);
    font-size: 23px;
    font-weight: 500;
    letter-spacing: .075em;
  }

  .brand-route {
    position: relative;
    display: block;
    width: 118px;
    height: 22px;
    margin-left: 2px;
    overflow: hidden;
  }

  .brand-route svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: .48;
  }

  .brand-route svg path:first-child { stroke-dasharray: 1 5; }

  nav {
    display: flex;
    align-items: center;
    gap: 28px;
  }

  nav a {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    color: var(--home-ink-strong);
    text-decoration: none;
    font-size: 14px;
    font-weight: 700;
  }

  nav a:hover {
    text-decoration: underline;
    text-underline-offset: 5px;
  }

  nav a:focus-visible,
  .menu-button:focus-visible,
  .primary:focus-visible,
  .text-link:focus-visible,
  .scroll-cue:focus-visible,
  .shiori-preview:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-focus) 50%, white);
    outline-offset: 3px;
  }

  .account-link {
    padding: 8px 15px;
    border: 1px solid rgba(36,54,75,.13);
    border-radius: var(--home-radius-pill);
    background: rgba(255,255,255,.72);
    box-shadow: var(--home-shadow-sm);
  }

  .menu-button { display: none; }

  .hero-main {
    display: grid;
    width: min(var(--home-content-wide), calc(100% - 64px));
    height: calc(100svh - 82px);
    margin: 0 auto;
    padding: 4vh 0 11vh;
    grid-template-columns: minmax(0, 1fr) 340px;
    align-items: center;
    gap: clamp(56px, 7vw, 104px);
    transform: translateY(var(--content-y));
    opacity: var(--content-opacity);
  }

  .hero-copy {
    max-width: 620px;
  }

  h1 {
    margin: 0;
    font-family: var(--home-font-serif);
    font-size: clamp(48px, 5.15vw, 72px);
    font-weight: 400;
    line-height: 1.28;
    letter-spacing: .035em;
  }

  .hero-copy > p {
    margin: 22px 0 30px;
    font-family: var(--home-font-serif);
    font-size: 16px;
    line-height: 1.8;
    letter-spacing: .07em;
  }

  .hero-actions {
    display: flex;
    width: min(100%, 310px);
    flex-direction: column;
    gap: 14px;
  }

  .primary {
    display: flex;
    width: 100%;
    min-height: 50px;
    padding: 14px 24px;
    border: 0;
    border-radius: var(--home-radius-pill);
    align-items: center;
    justify-content: center;
    gap: 32px;
    color: white;
    background: var(--home-action);
    box-shadow: 0 12px 28px rgba(49,91,125,.24);
    font: inherit;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    transition:
      background-color 160ms ease,
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .primary:hover {
    background: var(--home-action-hover);
    transform: translateY(-1px);
    box-shadow: 0 15px 32px rgba(49,91,125,.28);
  }

  .text-link {
    align-self: center;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    color: var(--home-ink-strong);
    font-size: 13px;
    font-weight: 800;
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 5px;
  }

  .quick-facts {
    display: flex;
    margin: 30px 0 0;
    padding: 0;
    gap: 24px;
    list-style: none;
  }

  .quick-facts li {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--home-ink);
    font-size: 12px;
    font-weight: 800;
  }

  .quick-facts span {
    display: grid;
    width: 27px;
    height: 27px;
    place-items: center;
    border: 1px solid currentColor;
    border-radius: 50%;
    font-size: 10px;
  }

  .quick-facts .plain-icon {
    border: 0;
    border-radius: 0;
  }

  .quick-facts .plain-icon svg {
    width: 23px;
    height: 23px;
  }

  .preview-area {
    position: relative;
    width: 340px;
  }

  .shiori-preview {
    display: block;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.9);
    border-radius: 20px;
    color: #1d2a40;
    background: rgba(255,255,255,.97);
    box-shadow: var(--home-shadow-card);
    text-decoration: none;
    transform: rotate(.7deg);
    transition: transform 180ms ease, box-shadow 180ms ease;
  }

  .shiori-preview:hover {
    transform: translateY(-5px) rotate(0);
    box-shadow: 0 30px 76px rgba(10,30,45,.3);
  }

  .preview-photo {
    display: block;
    height: 132px;
    overflow: hidden;
  }

  .preview-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .preview-body { padding: 18px 20px 16px; }

  .preview-kicker {
    display: inline-flex;
    margin-bottom: 9px;
    color: var(--home-muted);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .04em;
  }

  .preview-body h2 {
    margin: 0 0 5px;
    overflow: hidden;
    font-family: var(--home-font-serif);
    font-size: 19px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-body > p {
    margin: 0 0 15px;
    color: var(--home-muted);
    font-size: 12px;
    font-weight: 700;
  }

  .day-label {
    display: block;
    margin-bottom: 8px;
    font-size: 12px;
  }

  .preview-timeline {
    margin: 0;
    padding: 0 0 0 19px;
    border-left: 2px solid color-mix(in srgb, var(--accent) 70%, white);
    list-style: none;
  }

  .preview-timeline li {
    position: relative;
    display: grid;
    min-height: 38px;
    padding: 3px 0 8px 9px;
    grid-template-columns: 54px minmax(0, 1fr);
    align-items: start;
    font-size: 12px;
    font-weight: 800;
  }

  .preview-timeline li::before {
    position: absolute;
    top: 6px;
    left: -24px;
    width: 8px;
    height: 8px;
    border: 2px solid color-mix(in srgb, var(--accent) 70%, white);
    border-radius: 50%;
    background: white;
    content: "";
  }

  .preview-timeline time {
    color: var(--home-muted);
    font-size: 11px;
  }

  .preview-timeline li span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-more {
    display: flex;
    min-height: 44px;
    margin-top: 5px;
    padding-top: 11px;
    border-top: 1px solid var(--home-border);
    align-items: center;
    justify-content: space-between;
    color: var(--home-action);
    font-size: 12px;
    font-weight: 800;
  }

  .tap-note,
  .place-label {
    display: none;
  }

  .scroll-cue {
    position: absolute;
    z-index: 5;
    bottom: 18px;
    left: 50%;
    display: grid;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    place-items: center;
    color: var(--home-ink);
    background: white;
    box-shadow: var(--home-shadow-sm);
    cursor: pointer;
    transform: translateX(-50%);
  }

  .scroll-cue span {
    font-size: 20px;
    transform: translateY(-2px);
  }

  .paper-reveal {
    position: absolute;
    z-index: 2;
    right: -10%;
    bottom: -90px;
    left: -10%;
    height: 280px;
    border-radius: 50% 50% 0 0 / 70px 70px 0 0;
    background: var(--home-paper);
    transform: translateY(var(--paper-y));
    box-shadow: 0 -12px 34px rgba(18,36,48,.08);
  }

  .paper-reveal i,
  .paper-reveal b {
    position: absolute;
    top: 42px;
    width: 120px;
    border-top: 2px dashed #b9c4d1;
    opacity: .55;
  }

  .paper-reveal i {
    left: 22%;
    transform: rotate(8deg);
  }

  .paper-reveal b {
    right: 18%;
    transform: rotate(-6deg);
  }

  .create-section {
    position: relative;
    z-index: 3;
    min-height: 100vh;
    margin-top: -1px;
    padding: 78px 20px 110px;
    background: var(--home-paper);
  }

  .section-inner {
    width: min(var(--home-content-form), 100%);
    margin: 0 auto;
  }

  .create-heading {
    margin-bottom: 30px;
    text-align: center;
  }

  .create-heading .tiny-route {
    position: relative;
    display: block;
    width: 112px;
    height: 19px;
    margin: 0 auto 8px;
    color: #8ea0b0;
  }

  .create-heading .tiny-route i {
    position: absolute;
    top: 8px;
    left: 0;
    width: 88px;
    height: 5px;
    background: radial-gradient(circle, currentColor 1.2px, transparent 1.5px) 0 50% / 9px 5px repeat-x;
    opacity: .8;
    transform: rotate(-2deg);
  }

  .create-heading .tiny-route b {
    position: absolute;
    top: -1px;
    right: 2px;
    font-size: 17px;
    font-weight: 400;
    transform: rotate(7deg);
  }

  .create-heading p {
    margin: 0 0 8px;
    color: #657a90;
    font-size: 11px;
    font-weight: 900;
    letter-spacing: .18em;
  }

  .create-heading h2 {
    margin: 0;
    font-family: var(--home-font-serif);
    font-size: clamp(28px, 4vw, 39px);
    font-weight: 400;
    letter-spacing: .04em;
  }

  .recent-wrapper { margin-top: 42px; }

  @media (max-width: 1024px) {
    .hero-stage {
      height: auto;
      min-height: 100svh;
    }

    .hero-scene {
      position: relative;
      height: auto;
      min-height: 100svh;
      overflow: hidden;
    }

    .hero-picture {
      transform: none;
    }

    .site-header {
      width: min(var(--home-content-wide), calc(100% - 48px));
    }

    .brand-route { width: 96px; }

    .hero-main {
      display: flex;
      width: min(700px, calc(100% - 48px));
      height: auto;
      min-height: calc(100svh - 82px);
      padding: 54px 0 88px;
      align-items: center;
      flex-direction: column;
      gap: 38px;
      transform: none;
      opacity: 1;
    }

    .hero-copy {
      width: 100%;
      max-width: 680px;
      text-align: center;
    }

    .hero-actions {
      margin: 0 auto;
    }

    .quick-facts {
      justify-content: center;
    }

    .preview-area {
      width: min(100%, 360px);
    }

    .scroll-cue,
    .paper-reveal {
      display: none;
    }

    .create-section {
      min-height: auto;
      padding-top: 72px;
    }
  }

  @media (max-width: 767px) {
    .hero-shade {
      background:
        linear-gradient(180deg, rgba(7,25,38,.22) 0%, rgba(6,24,37,.52) 52%, rgba(5,22,34,.68) 100%);
    }

    .site-header {
      width: calc(100% - 32px);
      height: 66px;
    }

    .brand {
      color: white;
      text-shadow: 0 1px 5px rgba(0,0,0,.3);
    }

    .brand-mark {
      width: 34px;
      height: 34px;
      border-color: rgba(255,255,255,.72);
      color: white;
      background: rgba(255,255,255,.09);
    }

    .brand strong { font-size: 19px; }
    .brand-route { display: none; }

    nav {
      position: absolute;
      top: 58px;
      right: 0;
      display: none;
      width: 210px;
      padding: 10px;
      border: 1px solid var(--home-border);
      border-radius: var(--home-radius-lg);
      align-items: stretch;
      flex-direction: column;
      gap: 2px;
      background: rgba(255,255,255,.98);
      box-shadow: var(--home-shadow-md);
    }

    nav.open { display: flex; }

    nav a {
      min-height: 44px;
      padding: 10px 12px;
      color: var(--home-ink);
    }

    .account-link {
      border: 0;
      border-radius: var(--home-radius-sm);
      box-shadow: none;
      background: var(--home-surface-soft);
    }

    .menu-button {
      display: grid;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      place-items: center;
      color: var(--home-ink);
      background: rgba(255,255,255,.95);
      box-shadow: var(--home-shadow-sm);
      font-size: 18px;
      cursor: pointer;
    }

    .menu-button.open { font-size: 22px; }

    .hero-main {
      width: calc(100% - 32px);
      min-height: auto;
      padding: 42px 0 64px;
      gap: 30px;
    }

    .hero-copy {
      color: white;
      text-align: left;
      text-shadow: 0 2px 9px rgba(0,0,0,.26);
    }

    h1 {
      font-size: clamp(38px, 11vw, 48px);
      line-height: 1.28;
      letter-spacing: .025em;
    }

    .hero-copy > p {
      margin: 14px 0 22px;
      font-size: 14px;
      line-height: 1.7;
    }

    .hero-actions {
      width: 100%;
      max-width: 360px;
      margin: 0;
      gap: 10px;
    }

    .primary {
      min-height: 50px;
      box-shadow: 0 10px 28px rgba(5,20,31,.25);
    }

    .text-link {
      align-self: flex-start;
      color: white;
      font-size: 13px;
      text-shadow: 0 1px 5px rgba(0,0,0,.28);
    }

    .quick-facts {
      margin-top: 20px;
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 10px 18px;
    }

    .quick-facts li {
      color: white;
      font-size: 12px;
    }

    .quick-facts span {
      width: 26px;
      height: 26px;
    }

    .preview-area {
      width: min(100%, 350px);
      margin: 0 auto;
    }

    .shiori-preview {
      border-radius: var(--home-radius-lg);
      transform: none;
    }

    .preview-photo {
      display: block;
      height: 118px;
    }

    .preview-body {
      padding: 14px 17px 10px;
    }

    .preview-body h2 { font-size: 18px; }

    .preview-body > p { font-size: 12px; }

    .preview-timeline li {
      min-height: 36px;
      grid-template-columns: 52px minmax(0, 1fr);
      font-size: 12px;
    }

    .preview-timeline time { font-size: 11px; }

    .create-section {
      min-height: auto;
      padding: 64px 16px 82px;
    }
  }

  @media (max-height: 720px) and (max-width: 767px) {
    .hero-main {
      padding-top: 24px;
      gap: 22px;
    }

    h1 { font-size: 36px; }
    .hero-copy > p { margin: 10px 0 16px; }
    .quick-facts { margin-top: 14px; }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(html) { scroll-behavior: auto; }

    .hero-picture,
    .hero-main,
    .paper-reveal {
      transform: none;
    }

    .shiori-preview,
    .primary {
      transition: none;
    }
  }
</style>
