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

  let previewIndex = $state(data.previewIndex ?? 0);
  let swipeDirection = $state(1);
  const preview = $derived(previews[previewIndex] ?? previews[0]!);

  let loggedIn = $state(false);
  let menuOpen = $state(false);
  let recentItineraries = $state<Array<{ id: string; title: string; visitedAt: number }>>([]);
  let removedHistoryEntry = $state<ShioriHistory | null>(null);
  let undoTimer: ReturnType<typeof setTimeout> | null = null;
  let pointerStart = $state<{ x: number; y: number; id: number } | null>(null);

  const heroStyle = $derived(
    `--accent:${preview?.accent ?? "#7592b7"};--preview-enter-x:${swipeDirection * 12}px;`,
  );

  function refreshLoggedIn() {
    loggedIn = userAuth.isLoggedIn();
  }

  function scrollToCreate() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("create")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  function changePreview(direction: -1 | 1) {
    swipeDirection = direction;
    previewIndex = (previewIndex + direction + previews.length) % previews.length;
    queueNeighborPreload(previewIndex);
  }

  function isInteractiveTarget(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest("a, button, input, textarea, select, summary"));
  }

  function handleHeroPointerDown(event: PointerEvent) {
    if (isInteractiveTarget(event.target)) return;

    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function handleHeroPointerUp(event: PointerEvent) {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;

    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;

    if (Math.abs(dx) < 46 || Math.abs(dx) <= Math.abs(dy) * 1.2) return;
    changePreview(dx < 0 ? 1 : -1);
  }

  function preloadPreview(index: number) {
    const candidate = previews[(index + previews.length) % previews.length];
    if (!candidate) return;

    const image = new Image();
    image.decoding = "async";
    image.src = candidate.image;
  }

  function queueNeighborPreload(index: number) {
    if (typeof window === "undefined") return;

    const load = () => {
      preloadPreview(index + 1);
      preloadPreview(index - 1);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    };

    if (idleWindow.requestIdleCallback) {
      idleWindow.requestIdleCallback(load, { timeout: 1400 });
    } else {
      window.setTimeout(load, 500);
    }
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
    queueNeighborPreload(previewIndex);

    return () => {
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
  <section class="hero-stage" style={heroStyle}>
    <div
      class="hero-scene"
      onpointerdown={handleHeroPointerDown}
      onpointerup={handleHeroPointerUp}
      onpointercancel={() => (pointerStart = null)}
    >
      {#key preview.id}
        <picture class="hero-picture">
          <img
            src={preview.image}
            alt={`${preview.destination}の風景`}
            fetchpriority="high"
            decoding="async"
            style:object-position={preview.imagePosition}
          />
        </picture>
      {/key}
      <div class="hero-shade"></div>

      <header class="site-header">
        <a class="brand" href="/" aria-label="たびたび ホーム">
          <span class="brand-mark"><IconAirplane size={22} /></span>
          <strong>たびたび</strong>
        </a>

        <nav class:open={menuOpen} aria-label="サイトナビゲーション">
          <a href="/explore">みんなのしおり</a>
          <a href="/docs/index">使い方</a>
          <a class="account-link" href="/profile">{loggedIn ? "マイページ" : "ログイン"}</a>
        </nav>

        <button
          class="menu-button"
          class:open={menuOpen}
          onclick={() => (menuOpen = !menuOpen)}
          aria-label="メニューを開閉"
          aria-expanded={menuOpen}
        >
          {menuOpen ? "×" : "☰"}
        </button>
      </header>

      <main class="hero-main">
        <div class="hero-copy">
          <h1>旅の予定を、<br />ひとつに。</h1>
          <p>つくって、送って、みんなで見る。</p>

          <div class="hero-actions">
            <button class="primary" onclick={scrollToCreate}>
              <span>しおりを作る</span>
              <span class="action-arrow" aria-hidden="true">→</span>
            </button>
            <a class="text-link" href="/explore">みんなのしおりを見る <span aria-hidden="true">›</span></a>
          </div>

          <ul class="quick-facts" aria-label="サービスの特徴">
            <li>
              <span class="plain-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.6-4 2.8-6.1 6.5-6.1s5.9 2.1 6.5 6.1"/></svg>
              </span>
              登録不要
            </li>
            <li>
              <span class="plain-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="6" width="17" height="13" rx="2.5"/><path d="M3.5 9.5h17"/><path d="M16.5 14h.01"/></svg>
              </span>
              無料
            </li>
            <li>
              <span class="plain-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"><path d="M9.5 14.5l5-5"/><path d="M7.2 16.8l-1.1 1.1a3.4 3.4 0 0 1-4.8-4.8l3.1-3.1a3.4 3.4 0 0 1 4.8 0"/><path d="M16.8 7.2l1.1-1.1a3.4 3.4 0 0 1 4.8 4.8L19.6 14a3.4 3.4 0 0 1-4.8 0"/></svg>
              </span>
              URL共有
            </li>
          </ul>
        </div>

        <div class="preview-area">
          {#key preview.id}
            <a class="shiori-preview" href="/s/{preview.itineraryId}" aria-label="{preview.title}のしおりを開く">
              <div class="preview-body">
                <h2>{preview.title}</h2>
                <p>{preview.duration}・{preview.destination}</p>
                <div class="day-row">
                  <strong>Day 1</strong>
                  <span>旅の予定</span>
                </div>
                <ol class="preview-timeline">
                  {#each preview.steps.slice(0, 3) as step}
                    <li>
                      <time>{step.time}</time>
                      <span>{step.title}</span>
                    </li>
                  {/each}
                </ol>
                <div class="preview-more">
                  <span>しおりを見る</span>
                  <span aria-hidden="true">→</span>
                </div>
              </div>
            </a>
          {/key}
        </div>
      </main>
    </div>
  </section>

  <JourneySteps />

  <section id="create" class="create-section" aria-labelledby="create-title">
    <div class="section-inner">
      <div class="create-heading">
        <span class="tiny-route" aria-hidden="true">
          <i></i>
          <span class="tiny-plane"><IconAirplane size={17} /></span>
        </span>
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

  .hero-stage,
  .hero-scene {
    position: relative;
    height: 100svh;
    min-height: 640px;
  }

  .hero-scene {
    overflow: hidden;
    isolation: isolate;
    touch-action: pan-y;
    background: #6f8798;
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
    z-index: -3;
    animation: hero-photo-in 240ms ease both;
  }

  .hero-picture img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .hero-shade {
    z-index: -2;
    background:
      linear-gradient(90deg, rgba(5,22,36,.72) 0%, rgba(5,22,36,.50) 42%, rgba(5,22,36,.18) 74%, rgba(5,22,36,.12) 100%),
      linear-gradient(0deg, rgba(5,22,36,.38) 0%, transparent 47%, rgba(5,22,36,.12) 100%);
  }

  .site-header {
    position: relative;
    z-index: 4;
    display: flex;
    width: min(var(--home-content-wide), calc(100% - 64px));
    height: 72px;
    margin: 0 auto;
    align-items: center;
    justify-content: space-between;
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    color: white;
    text-decoration: none;
    text-shadow: 0 1px 7px rgba(0,0,0,.24);
  }

  .brand-mark {
    display: grid;
    width: 36px;
    height: 36px;
    border: 1px solid rgba(255,255,255,.76);
    border-radius: 50%;
    place-items: center;
    color: white;
    background: rgba(255,255,255,.08);
  }

  .brand strong {
    font-family: var(--home-font-serif);
    font-size: 22px;
    font-weight: 500;
    letter-spacing: .075em;
  }

  nav {
    display: flex;
    align-items: center;
    gap: 28px;
  }

  nav a {
    display: inline-flex;
    min-height: 44px;
    align-items: center;
    color: white;
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
    text-shadow: 0 1px 5px rgba(0,0,0,.24);
  }

  nav a:hover {
    text-decoration: underline;
    text-underline-offset: 5px;
  }

  .account-link {
    padding: 8px 15px;
    border: 1px solid rgba(255,255,255,.32);
    border-radius: var(--home-radius-pill);
    background: rgba(255,255,255,.12);
    backdrop-filter: blur(8px);
  }

  .menu-button { display: none; }

  .hero-main {
    display: grid;
    width: min(var(--home-content-wide), calc(100% - 64px));
    height: calc(100svh - 72px);
    min-height: 568px;
    margin: 0 auto;
    padding: 3vh 0 7vh;
    grid-template-columns: minmax(0, 1fr) 320px;
    align-items: center;
    gap: clamp(48px, 8vw, 116px);
  }

  .hero-copy {
    max-width: 620px;
    color: white;
    text-shadow: 0 2px 10px rgba(0,0,0,.28);
  }

  h1 {
    margin: 0;
    font-family: var(--home-font-serif);
    font-size: clamp(48px, 5vw, 70px);
    font-weight: 400;
    line-height: 1.26;
    letter-spacing: .035em;
  }

  .hero-copy > p {
    margin: 18px 0 25px;
    font-family: var(--home-font-serif);
    font-size: 16px;
    line-height: 1.8;
    letter-spacing: .07em;
  }

  .hero-actions {
    display: flex;
    width: min(100%, 310px);
    flex-direction: column;
    gap: 8px;
  }

  .primary {
    display: flex;
    width: 100%;
    min-height: 52px;
    padding: 14px 24px;
    border: 1px solid rgba(255,255,255,.18);
    border-radius: var(--home-radius-pill);
    align-items: center;
    justify-content: center;
    gap: 30px;
    color: white;
    background: rgba(39,82,118,.96);
    box-shadow: 0 12px 30px rgba(5,20,31,.22);
    font: inherit;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    backdrop-filter: blur(5px);
    transition: background-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  }

  .primary:hover {
    background: rgba(32,72,105,.99);
    transform: translateY(-1px);
    box-shadow: 0 15px 34px rgba(5,20,31,.28);
  }

  .primary:active {
    transform: scale(.985);
  }

  .action-arrow {
    transition: transform 150ms ease;
  }

  .primary:hover .action-arrow {
    transform: translateX(4px);
  }

  .text-link {
    align-self: center;
    display: inline-flex;
    min-height: 42px;
    padding: 4px 8px;
    align-items: center;
    color: white;
    font-size: 12px;
    font-weight: 800;
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 5px;
  }

  .quick-facts {
    display: flex;
    width: min(100%, 330px);
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
  }

  .quick-facts li {
    display: flex;
    min-width: 0;
    flex: 1;
    align-items: center;
    justify-content: center;
    gap: 6px;
    color: white;
    font-size: 11px;
    font-weight: 800;
  }

  .quick-facts li + li {
    border-left: 1px solid rgba(255,255,255,.26);
  }

  .plain-icon {
    display: grid;
    width: 25px;
    height: 25px;
    place-items: center;
  }

  .plain-icon svg {
    width: 21px;
    height: 21px;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .preview-area {
    display: grid;
    width: 320px;
    justify-items: center;
  }

  .shiori-preview {
    display: block;
    width: 100%;
    overflow: hidden;
    border: 1px solid rgba(255,255,255,.86);
    border-radius: 21px;
    color: #1d2a40;
    background: rgba(255,255,255,.96);
    box-shadow: 0 24px 62px rgba(7,25,38,.26);
    text-decoration: none;
    animation: preview-card-in 220ms ease both;
    transition: transform 170ms ease, box-shadow 170ms ease;
  }

  .shiori-preview:hover {
    transform: translateY(-3px);
    box-shadow: 0 28px 68px rgba(7,25,38,.31);
  }

  .preview-body {
    padding: 18px 19px 12px;
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
    margin: 0 0 13px;
    color: var(--home-muted);
    font-size: 11px;
    font-weight: 700;
  }

  .day-row {
    display: flex;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--home-border);
    align-items: baseline;
    gap: 12px;
    font-size: 11px;
  }

  .day-row strong {
    color: var(--home-ink-strong);
  }

  .day-row span {
    color: var(--home-muted);
  }

  .preview-timeline {
    display: grid;
    width: 100%;
    margin: 0;
    padding: 0 0 0 18px;
    border-left: 2px solid color-mix(in srgb, var(--accent) 72%, white);
    grid-template-columns: minmax(0, 1fr);
    list-style: none;
  }

  .preview-timeline li {
    position: relative;
    display: grid;
    width: 100%;
    min-width: 0;
    min-height: 37px;
    padding: 4px 0 7px 10px;
    grid-template-columns: 50px minmax(0, 1fr);
    align-items: start;
    font-size: 11px;
    font-weight: 800;
  }

  .preview-timeline li::before {
    position: absolute;
    top: 7px;
    left: -23px;
    width: 8px;
    height: 8px;
    border: 2px solid color-mix(in srgb, var(--accent) 76%, white);
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
    min-height: 42px;
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px solid var(--home-border);
    align-items: center;
    justify-content: space-between;
    color: var(--home-action);
    font-size: 12px;
    font-weight: 900;
  }

  .create-section {
    position: relative;
    z-index: 2;
    padding: 78px 20px 98px;
    background:
      linear-gradient(180deg, rgba(233,243,248,.42) 0, transparent 120px),
      var(--home-paper);
  }

  .section-inner {
    width: min(var(--home-content-form), 100%);
    margin: 0 auto;
  }

  .create-heading {
    margin-bottom: 30px;
    text-align: center;
  }

  .tiny-route {
    position: relative;
    display: block;
    width: 112px;
    height: 19px;
    margin: 0 auto 8px;
    color: #8ea0b0;
  }

  .tiny-route i {
    position: absolute;
    top: 8px;
    left: 0;
    width: 88px;
    height: 5px;
    background: radial-gradient(circle, currentColor 1.2px, transparent 1.5px) 0 50% / 9px 5px repeat-x;
    opacity: .8;
    transform: rotate(-2deg);
  }

  .tiny-plane {
    position: absolute;
    top: -2px;
    right: 1px;
    display: grid;
    place-items: center;
    transform: rotate(7deg);
  }

  .create-heading p {
    margin: 0 0 8px;
    color: #657a90;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .18em;
  }

  .create-heading h2 {
    margin: 0;
    font-family: var(--home-font-serif);
    font-size: clamp(29px, 4vw, 39px);
    font-weight: 400;
    letter-spacing: .04em;
  }

  .recent-wrapper {
    margin-top: 54px;
  }

  .brand:focus-visible,
  nav a:focus-visible,
  .menu-button:focus-visible,
  .primary:focus-visible,
  .text-link:focus-visible,
  .shiori-preview:focus-visible {
    outline: 3px solid rgba(210,231,246,.9);
    outline-offset: 3px;
  }

  @keyframes hero-photo-in {
    from { opacity: .82; transform: scale(1.012); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes preview-card-in {
    from { opacity: .78; transform: translateX(var(--preview-enter-x)); }
    to { opacity: 1; transform: translateX(0); }
  }

  @media (min-width: 768px) and (max-width: 1180px) {
    .site-header {
      width: calc(100% - 40px);
      height: 68px;
    }

    nav { gap: 18px; }
    nav a { font-size: 13px; }

    .hero-main {
      width: calc(100% - 40px);
      height: calc(100svh - 68px);
      min-height: 572px;
      padding: 3vh 0 5vh;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: clamp(28px, 4vw, 50px);
    }

    h1 {
      font-size: clamp(42px, 5.3vw, 58px);
    }

    .hero-copy > p {
      margin: 15px 0 21px;
      font-size: 14px;
    }

    .preview-area {
      width: 300px;
      justify-self: end;
    }
  }

  @media (max-width: 767px) {
    .hero-stage,
    .hero-scene {
      height: 100svh;
      min-height: 640px;
    }

    .hero-shade {
      background:
        linear-gradient(180deg, rgba(5,22,36,.28) 0%, rgba(5,22,36,.46) 46%, rgba(5,22,36,.66) 100%),
        linear-gradient(90deg, rgba(5,22,36,.18), transparent 72%);
    }

    .site-header {
      width: calc(100% - 28px);
      height: 60px;
    }

    .brand-mark {
      width: 32px;
      height: 32px;
    }

    .brand strong {
      font-size: 18px;
    }

    nav {
      position: absolute;
      top: 55px;
      right: 0;
      display: none;
      width: 206px;
      padding: 9px;
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
      text-shadow: none;
    }

    .account-link {
      border: 0;
      border-radius: var(--home-radius-sm);
      background: var(--home-surface-soft);
      backdrop-filter: none;
    }

    .menu-button {
      display: grid;
      width: 42px;
      height: 42px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      place-items: center;
      color: var(--home-ink);
      background: rgba(255,255,255,.96);
      box-shadow: 0 5px 18px rgba(5,22,36,.16);
      font-size: 17px;
      cursor: pointer;
    }

    .menu-button.open { font-size: 21px; }

    .hero-main {
      display: flex;
      width: calc(100% - 28px);
      height: calc(100svh - 60px);
      min-height: 580px;
      margin: 0 auto;
      padding: clamp(12px, 2.3svh, 21px) 0 clamp(17px, 2.7svh, 26px);
      align-items: stretch;
      flex-direction: column;
      gap: clamp(18px, 3svh, 27px);
    }

    .hero-copy {
      width: 100%;
      max-width: 390px;
      margin: 0 auto;
      text-align: left;
    }

    h1 {
      font-size: clamp(37px, 10.7vw, 45px);
      line-height: 1.22;
      letter-spacing: .025em;
    }

    .hero-copy > p {
      margin: 9px 0 14px;
      font-size: 13px;
      line-height: 1.6;
    }

    .hero-actions {
      width: 100%;
      max-width: none;
      gap: 4px;
    }

    .primary {
      min-height: 50px;
      padding-block: 12px;
    }

    .text-link {
      min-height: 38px;
      font-size: 12px;
    }

    .quick-facts {
      width: 100%;
      max-width: none;
      margin-top: 8px;
    }

    .quick-facts li {
      gap: 4px;
      font-size: 10px;
    }

    .plain-icon {
      width: 22px;
      height: 22px;
    }

    .plain-icon svg {
      width: 19px;
      height: 19px;
    }

    .preview-area {
      width: min(82vw, 316px);
      margin: auto auto 0;
      flex: 0 0 auto;
    }

    .shiori-preview {
      width: 100%;
      border-radius: 19px;
    }

    .preview-body {
      padding: 15px 17px 10px;
    }

    .preview-body h2 {
      font-size: 18px;
    }

    .preview-body > p {
      margin-bottom: 11px;
    }

    .preview-timeline li {
      min-height: 34px;
      grid-template-columns: 48px minmax(0, 1fr);
    }

    .preview-more {
      min-height: 38px;
      padding-top: 8px;
    }

    .create-section {
      padding: 72px 16px 82px;
    }

    .create-heading {
      margin-bottom: 25px;
    }

    .recent-wrapper {
      margin-top: 48px;
    }
  }

  @media (max-width: 360px) {
    .site-header,
    .hero-main {
      width: calc(100% - 24px);
    }

    h1 {
      font-size: 36px;
    }

    .preview-area {
      width: min(84vw, 292px);
    }
  }

  @media (max-height: 720px) and (max-width: 767px) {
    .hero-stage,
    .hero-scene {
      min-height: 600px;
    }

    .hero-main {
      min-height: 540px;
      padding-top: 8px;
      padding-bottom: 12px;
      gap: 12px;
    }

    h1 { font-size: 34px; }
    .hero-copy > p { margin: 6px 0 9px; }
    .primary { min-height: 46px; }
    .text-link { min-height: 34px; }
    .quick-facts { margin-top: 3px; }
    .preview-area { width: min(78vw, 286px); }
    .preview-body { padding-top: 12px; }
    .preview-timeline li { min-height: 30px; padding-bottom: 4px; }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(html) { scroll-behavior: auto; }

    .hero-picture,
    .shiori-preview {
      animation: none;
    }

    .primary,
    .action-arrow,
    .shiori-preview {
      transition: none;
    }
  }
</style>
