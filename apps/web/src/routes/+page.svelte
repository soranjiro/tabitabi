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
  import ItineraryCarousel from "./home/ItineraryCarousel.svelte";
  import { previews } from "./home/landing-previews";

  const { data }: { data: PageData } = $props();

  let previewIndex = $state(data.previewIndex ?? 0);
  const preview = $derived(previews[previewIndex] ?? previews[0]!);

  let loggedIn = $state(false);
  let menuOpen = $state(false);
  let recentItineraries = $state<
    Array<{ id: string; title: string; visitedAt: number }>
  >([]);
  let removedHistoryEntry = $state<ShioriHistory | null>(null);
  let undoTimer: ReturnType<typeof setTimeout> | null = null;
  let preloadIdle: number | undefined;
  let preloadTimer: ReturnType<typeof setTimeout> | undefined;
  const preloadedImages = new Set<string>();

  function refreshLoggedIn() {
    loggedIn = userAuth.isLoggedIn();
  }

  function scrollToCreate() {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document
      .getElementById("create")
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }

  function selectPreview(index: number) {
    previewIndex = index;
    queueNeighborPreload(index);
  }

  function preloadPreview(index: number) {
    const candidate = previews[(index + previews.length) % previews.length];
    if (!candidate || preloadedImages.has(candidate.image)) return;
    preloadedImages.add(candidate.image);

    const image = new Image();
    image.decoding = "async";
    image.src = candidate.image;
  }

  function canPreloadNeighborImages() {
    if (typeof navigator === "undefined" || navigator.onLine === false)
      return false;

    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;

    if (connection?.saveData) return false;
    if (connection?.effectiveType && connection.effectiveType !== "4g")
      return false;
    return true;
  }

  function queueNeighborPreload(index: number) {
    if (typeof window === "undefined" || !canPreloadNeighborImages()) return;
    cancelNeighborPreload();

    const load = () => {
      preloadPreview(index + 1);
      preloadPreview(index - 1);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (
        callback: () => void,
        options?: { timeout: number },
      ) => number;
    };

    if (idleWindow.requestIdleCallback) {
      preloadIdle = idleWindow.requestIdleCallback(load, { timeout: 1800 });
    } else {
      preloadTimer = setTimeout(load, 700);
    }
  }

  function cancelNeighborPreload() {
    if (preloadIdle !== undefined) window.cancelIdleCallback?.(preloadIdle);
    if (preloadTimer !== undefined) clearTimeout(preloadTimer);
    preloadIdle = undefined;
    preloadTimer = undefined;
  }

  function removeRecent(id: string) {
    removedHistoryEntry =
      auth.getHistory().find((entry) => entry.shioriId === id) ?? null;
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
    preloadedImages.add(preview.image);
    queueNeighborPreload(previewIndex);

    return () => {
      if (undoTimer) clearTimeout(undoTimer);
      cancelNeighborPreload();
    };
  });
</script>

<svelte:head>
  <title>たびたび - 旅の予定を、ひとつに。</title>
  <link rel="preload" as="image" href={preview.image} fetchpriority="high" />
  <meta
    name="description"
    content="旅の予定をひとつにまとめて、URLでかんたん共有。登録不要・無料で使える旅のしおり作成サービスです。"
  />
  <link rel="canonical" href="https://tabitabi.pages.dev/" />
  <meta property="og:title" content="たびたび - 旅の予定を、ひとつに。" />
  <meta
    property="og:description"
    content="つくって、送って、みんなで見る。無料の旅のしおり作成サービス。"
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tabitabi.pages.dev/" />
  <meta property="og:image" content="https://tabitabi.pages.dev/og-image.png" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:site_name" content="たびたび" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div
  class="home-page"
  style={`--home-action:${preview.action};--home-action-hover:color-mix(in srgb, ${preview.action}, #172938 18%)`}
>
  <section class="hero-stage">
    <div class="hero-scene">
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

        <button
          class="menu-button"
          class:open={menuOpen}
          onclick={() => (menuOpen = !menuOpen)}
          aria-label="メニューを開閉"
          aria-expanded={menuOpen}
          aria-controls="home-navigation"
        >
          <svg class="menu-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path class="menu-top" d="M5 6h14" />
            <path class="menu-middle" d="M5 12h14" />
            <path class="menu-bottom" d="M5 18h14" />
          </svg>
        </button>

        <nav
          id="home-navigation"
          class:open={menuOpen}
          aria-label="サイトナビゲーション"
        >
          <a href="/explore">みんなのしおり</a>
          <a href="/docs/index">使い方</a>
          <a class="account-link" href="/profile"
            >{loggedIn ? "マイページ" : "ログイン"}</a
          >
        </nav>
      </header>

      <div class="hero-main">
        <div class="hero-copy">
          <h1>旅の予定を、<br />ひとつに。</h1>
          <p>つくって、送って、みんなで見る。</p>

          <div class="hero-actions">
            <a
              class="primary"
              href="#create"
              onclick={(event) => {
                event.preventDefault();
                scrollToCreate();
              }}
            >
              <span>しおりを作る</span>
              <span class="action-arrow" aria-hidden="true">→</span>
            </a>
            <a class="text-link" href="/explore"
              >みんなのしおりを見る <span aria-hidden="true">›</span></a
            >
          </div>

          <ul class="quick-facts" aria-label="サービスの特徴">
            <li>
              <span class="plain-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"
                  ><circle cx="12" cy="8" r="3.2" /><path
                    d="M5.5 20c.6-4 2.8-6.1 6.5-6.1s5.9 2.1 6.5 6.1"
                  /></svg
                >
              </span>
              登録不要
            </li>
            <li>
              <span class="plain-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"
                  ><rect x="3.5" y="6" width="17" height="13" rx="2.5" /><path
                    d="M3.5 9.5h17"
                  /><path d="M16.5 14h.01" /></svg
                >
              </span>
              無料
            </li>
            <li>
              <span class="plain-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none"
                  ><path d="M9.5 14.5l5-5" /><path
                    d="M7.2 16.8l-1.1 1.1a3.4 3.4 0 0 1-4.8-4.8l3.1-3.1a3.4 3.4 0 0 1 4.8 0"
                  /><path
                    d="M16.8 7.2l1.1-1.1a3.4 3.4 0 0 1 4.8 4.8L19.6 14a3.4 3.4 0 0 1-4.8 0"
                  /></svg
                >
              </span>
              URL共有
            </li>
          </ul>
        </div>

        <ItineraryCarousel
          initialIndex={data.previewIndex}
          onselect={selectPreview}
        />
      </div>
    </div>
  </section>

  <JourneySteps />

  <section id="create" class="create-section" aria-labelledby="create-title">
    <div class="section-inner">
      <div class="create-heading">
        <svg
          class="form-thread"
          viewBox="0 0 620 112"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            pathLength="1"
            d="M310 0C310 20 608 10 608 48C608 90 359 86 325 98C314 102 310 104 310 112"
          />
        </svg>
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
  }
  :global(html) {
    scroll-behavior: smooth;
  }
  .home-page {
    --home-muted: #566c80;
    color: var(--home-ink);
    background: var(--home-paper);
    font-family: var(--home-font-sans);
  }
  .hero-stage {
    position: relative;
    background: var(--home-paper);
  }
  .hero-scene {
    position: relative;
    min-height: 100svh;
    overflow: hidden;
    isolation: isolate;
  }
  .hero-picture,
  .hero-shade {
    position: absolute;
    inset: 0;
    z-index: -1;
    pointer-events: none;
  }
  .hero-picture img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .hero-shade {
    background:
      linear-gradient(
        90deg,
        rgba(255, 252, 248, 0.94),
        rgba(255, 252, 248, 0.69) 42%,
        rgba(255, 252, 248, 0.12) 80%
      ),
      linear-gradient(0deg, var(--home-paper), transparent 30%);
  }
  .site-header {
    position: relative;
    z-index: 2;
    display: flex;
    width: min(1180px, calc(100% - 64px));
    height: 88px;
    margin: auto;
    align-items: center;
    justify-content: space-between;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--home-ink-strong);
    text-decoration: none;
  }
  .brand-mark {
    display: grid;
    width: 36px;
    height: 36px;
    border: 1px solid currentColor;
    border-radius: 50%;
    place-items: center;
    color: var(--home-action);
  }
  .brand strong {
    font-family: var(--home-font-serif);
    font-size: 22px;
    font-weight: 500;
    letter-spacing: 0.12em;
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
    color: var(--home-ink);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
  }
  nav a:hover {
    text-decoration: underline;
    text-underline-offset: 5px;
  }
  .account-link {
    padding-inline: 20px;
    border: 1px solid rgba(49, 91, 125, 0.2);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.75);
  }
  .menu-button {
    display: none;
  }
  .menu-icon {
    width: 24px;
    height: 24px;
    display: block;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
  }
  .menu-icon path {
    transform-origin: 12px 12px;
    transition:
      transform 180ms ease,
      opacity 180ms ease;
  }
  .menu-button.open .menu-top {
    transform: translateY(6px) rotate(45deg);
    transform-origin: 12px 6px;
  }
  .menu-button.open .menu-middle {
    opacity: 0;
  }
  .menu-button.open .menu-bottom {
    transform: translateY(-6px) rotate(-45deg);
    transform-origin: 12px 18px;
  }
  .hero-main {
    display: grid;
    width: min(1180px, calc(100% - 64px));
    min-height: calc(100svh - 88px);
    margin: auto;
    padding: 36px 0 64px;
    grid-template-columns: minmax(0, 1fr) minmax(0, 480px);
    align-items: center;
    gap: 48px;
  }
  h1 {
    margin: 0;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: clamp(48px, 5.4vw, 76px);
    font-weight: 400;
    line-height: 1.3;
    letter-spacing: 0.03em;
  }
  .hero-copy > p {
    margin: 22px 0 28px;
    font-family: var(--home-font-serif);
    font-size: 16px;
    letter-spacing: 0.05em;
    line-height: 1.7;
  }
  .hero-actions {
    display: flex;
    width: min(100%, 310px);
    flex-direction: column;
    gap: 8px;
  }
  .primary {
    display: flex;
    min-height: 50px;
    padding: 12px 24px;
    align-items: center;
    justify-content: center;
    gap: 28px;
    border: 0;
    border-radius: 999px;
    color: white;
    background: var(--home-action);
    box-shadow: 0 8px 24px rgba(49, 91, 125, 0.2);
    font: inherit;
    font-size: 14px;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
    transition:
      background-color 160ms ease,
      transform 160ms ease;
  }
  .primary:hover {
    background: var(--home-action-hover);
    transform: translateY(-2px);
  }
  .action-arrow {
    font-size: 20px;
  }
  .text-link {
    display: inline-flex;
    min-height: 44px;
    align-self: center;
    align-items: center;
    gap: 10px;
    padding: 4px 8px;
    color: var(--home-ink);
    font-size: 12px;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 5px;
  }
  .quick-facts {
    display: flex;
    margin: 24px 0 0;
    padding: 0;
    gap: 24px;
    list-style: none;
  }
  .quick-facts li {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 11px;
    font-weight: 600;
  }
  .plain-icon {
    display: grid;
    place-items: center;
  }
  .plain-icon svg {
    width: 22px;
    height: 22px;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
  }
  .create-section {
    padding: 0 24px 80px;
    scroll-margin-top: 24px;
  }
  .section-inner {
    width: min(620px, 100%);
    margin: auto;
  }
  .create-heading {
    position: relative;
    display: grid;
    height: 112px;
    place-items: center;
    text-align: center;
  }
  .form-thread {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }
  .form-thread path {
    fill: none;
    stroke: #1c1c1c;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-dasharray: none;
    stroke-dashoffset: 0;
    vector-effect: non-scaling-stroke;
  }
  .create-heading h2 {
    position: relative;
    padding: 6px 10px;
    background: var(--home-paper);
    margin: 0;
    font-family: var(--home-font-serif);
    font-size: clamp(26px, 3.5vw, 36px);
    font-weight: 400;
    letter-spacing: 0.04em;
  }
  .recent-wrapper {
    margin-top: 36px;
  }
  a:focus-visible,
  button:focus-visible {
    outline: 3px solid var(--home-focus);
    outline-offset: 4px;
  }
  @media (min-width: 768px) and (max-width: 1050px) {
    .site-header,
    .hero-main {
      width: calc(100% - 40px);
    }
    .hero-main {
      grid-template-columns: minmax(0, 1fr) minmax(0, 400px);
      gap: 20px;
    }
    h1 {
      font-size: clamp(40px, 5vw, 55px);
    }
    .hero-copy > p {
      font-size: 14px;
    }
    .quick-facts {
      gap: 14px;
      flex-wrap: wrap;
    }
  }
  @media (max-width: 767px) {
    .hero-shade {
      background: linear-gradient(
        180deg,
        rgba(255, 252, 248, 0.6),
        rgba(255, 252, 248, 0.48) 40%,
        rgba(255, 252, 248, 0.06) 65%,
        var(--home-paper) 100%
      );
    }
    .site-header {
      width: calc(100% - 40px);
      height: calc(64px + env(safe-area-inset-top, 0px));
      padding-top: env(safe-area-inset-top, 0px);
    }
    .brand strong {
      font-size: 19px;
    }
    .brand-mark {
      width: 32px;
      height: 32px;
    }
    nav {
      position: absolute;
      top: calc(58px + env(safe-area-inset-top, 0px));
      right: 0;
      display: none;
      width: 210px;
      padding: 10px;
      border: 1px solid var(--home-border);
      border-radius: 16px;
      flex-direction: column;
      align-items: stretch;
      gap: 2px;
      background: white;
      box-shadow: var(--home-shadow-md);
    }
    nav.open {
      display: flex;
    }
    nav a {
      padding: 10px 12px;
    }
    .account-link {
      border: 0;
      background: var(--home-surface-soft);
      border-radius: 8px;
    }
    .menu-button {
      display: grid;
      width: 44px;
      height: 44px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      place-items: center;
      color: var(--home-action);
      background: white;
      box-shadow: var(--home-shadow-sm);
      font-size: 20px;
      cursor: pointer;
    }
    .hero-main {
      display: flex;
      width: 100%;
      min-height: calc(100svh - 64px - env(safe-area-inset-top, 0px));
      padding: 24px 0 22px;
      flex-direction: column;
      justify-content: space-evenly;
      align-items: stretch;
      gap: 16px;
    }
    .hero-copy {
      padding-inline: 24px;
    }
    h1 {
      font-size: clamp(38px, 10.8vw, 52px);
      line-height: 1.25;
    }
    .hero-copy > p {
      margin: 12px 0 16px;
      font-size: 13px;
      letter-spacing: 0.01em;
    }
    .hero-actions {
      width: min(100%, 360px);
      margin: auto;
      gap: 2px;
    }
    .primary {
      min-height: 46px;
    }
    .quick-facts {
      margin-top: 12px;
      justify-content: center;
      gap: clamp(12px, 5vw, 24px);
    }
    .quick-facts li {
      font-size: 10px;
      gap: 5px;
    }
    .plain-icon svg {
      width: 20px;
      height: 20px;
    }
    .create-section {
      padding: 0 16px 56px;
    }
  }
  @media (max-height: 700px) and (max-width: 767px) {
    .hero-main {
      padding: 8px 0 10px;
      gap: 6px;
    }
    h1 {
      font-size: 34px;
    }
    .hero-copy > p {
      margin: 6px 0 10px;
    }
    .quick-facts {
      margin-top: 4px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(html) {
      scroll-behavior: auto;
    }
    .primary,
    .menu-icon path {
      transition: none;
    }
  }
</style>
