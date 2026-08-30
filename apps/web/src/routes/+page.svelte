<script lang="ts">
  import { onMount } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import { auth } from "$lib/auth";
  import { userAuth } from "$lib/user-auth";
  import { resetDemoMode } from "$lib/demo";
  import CreateForm from "./home/CreateForm.svelte";
  import RecentItineraries from "./home/RecentItineraries.svelte";
  import Footer from "./home/Footer.svelte";
  import IconAirplane from "./home/icons/IconAirplane.svelte";

  type Season = {
    id: "spring" | "summer" | "autumn" | "winter";
    itineraryId: string;
    title: string;
    duration: string;
    destination: string;
    accent: string;
    imagePosition: string;
    steps: Array<{ time: string; title: string }>;
  };

  const seasons: Season[] = [
    {
      id: "spring",
      itineraryId: "official-spring-public",
      title: "春休みの京都旅行",
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
      itineraryId: "official-autumn-public",
      title: "日光・那須をめぐる秋の5日間",
      duration: "4泊5日",
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
      itineraryId: "official-winter-public",
      title: "冬休みのスキー旅行",
      duration: "7泊8日",
      destination: "長野・東京",
      accent: "#7592b7",
      imagePosition: "center 50%",
      steps: [
        { time: "08:00", title: "東京駅から長野駅へ移動" },
        { time: "11:30", title: "長野駅から白馬へバス移動" },
        { time: "13:30", title: "スキー用具レンタル" },
        { time: "14:45", title: "スキー初心者レッスン" },
      ],
    },
  ];

  let season = $state<Season | null>(null);
  let loggedIn = $state(false);
  let menuOpen = $state(false);
  let scrollProgress = $state(0);
  let heroStage = $state<HTMLElement | null>(null);
  let recentItineraries = $state<Array<{ id: string; title: string; visitedAt: number }>>([]);

  const heroStyle = $derived(
    `--accent:${season?.accent ?? "#ec858c"};--paper-y:${Math.round((1 - scrollProgress) * 190)}px;--image-scale:${1 + scrollProgress * 0.045};--content-y:${Math.round(scrollProgress * -32)}px;--content-opacity:${1 - scrollProgress * 0.28}`,
  );

  function refreshLoggedIn() { loggedIn = userAuth.isLoggedIn(); }
  function scrollToCreate() { document.getElementById("create")?.scrollIntoView({ behavior: "smooth" }); }
  function removeRecent(id: string) {
    auth.removeFromHistory(id);
    recentItineraries = auth.getRecentItineraries();
  }

  afterNavigate(refreshLoggedIn);
  onMount(() => {
    resetDemoMode();
    refreshLoggedIn();
    recentItineraries = auth.getRecentItineraries();
    season = seasons[Math.floor(Math.random() * seasons.length)];

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
    };
  });
</script>

<svelte:head>
  <title>たびたび - 旅の予定を、ひとつに。</title>
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
      {#if season}
        <picture class="hero-picture">
          <source srcset="/hero/background-{season.id}.avif" type="image/avif" />
          <source srcset="/hero/background-{season.id}.webp" type="image/webp" />
          <img src="/hero/background-{season.id}.webp" alt="{season.destination}の{season.id === 'spring' ? '春' : season.id === 'summer' ? '夏' : season.id === 'autumn' ? '秋' : '冬'}の風景" style:object-position={season.imagePosition} />
        </picture>
      {/if}
      <div class="hero-shade"></div>

      <header class="site-header">
        <a class="brand" href="/" aria-label="たびたび ホーム">
          <span class="brand-mark"><IconAirplane size={23} /></span>
          <strong>たびたび</strong>
          <span class="brand-route" aria-hidden="true"><i></i><b>›</b></span>
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

        {#if season}
          <div class="preview-area">
            <a class="shiori-preview" href="/itineraries/{season.itineraryId}" aria-label="{season.title}のしおりを開く">
              <picture class="preview-photo">
                <source srcset="/hero/background-{season.id}.avif" type="image/avif" />
                <source srcset="/hero/background-{season.id}.webp" type="image/webp" />
                <img src="/hero/background-{season.id}.webp" alt="" style:object-position={season.imagePosition} />
              </picture>
              <div class="preview-body">
                <div class="preview-label"><b aria-hidden="true">♡</b></div>
                <h2>{season.title}</h2>
                <p>{season.duration}・{season.destination}</p>
                <strong class="day-label">Day 1</strong>
                <ol>
                  {#each season.steps as step}
                    <li><time>{step.time}</time><span>{step.title}</span></li>
                  {/each}
                </ol>
              </div>
              <div class="preview-tabs"><span>⌖<small>旅程</small></span><span>◇<small>マップ</small></span><span>□<small>メモ</small></span><span>▧<small>写真</small></span></div>
            </a>
            <div class="tap-note" aria-hidden="true"><svg viewBox="0 0 70 38"><path d="M66 30C50 31 45 13 30 14 19 15 14 24 4 19"/><path d="M58 24l8 6-8 5"/></svg><p>タップで<br />しおりを開く</p></div>
          </div>
        {/if}
      </main>

      <p class="place-label">{#if season}⌖ {season.destination}{/if}</p>
      <button class="scroll-cue" onclick={scrollToCreate} aria-label="下へスクロール"><span>⌄</span></button>
      <div class="paper-reveal" aria-hidden="true"><i></i><b></b></div>
    </div>
  </section>

  <section id="create" class="create-section" aria-labelledby="create-title">
    <div class="section-inner">
      <div class="create-heading">
        <span class="tiny-route" aria-hidden="true"><i></i><b>✈</b></span>
        <p>NEXT TRIP</p>
        <h2 id="create-title">次の旅を、つくろう。</h2>
      </div>
      <CreateForm />
      {#if recentItineraries.length > 0}
        <div class="recent-wrapper"><RecentItineraries items={recentItineraries} onRemove={removeRecent} /></div>
      {/if}
    </div>
  </section>
  <Footer />
</div>

<style>
  :global(body) { margin: 0; color: #15243c; background: #fff; }
  :global(*) { box-sizing: border-box; }
  :global(html) { scroll-behavior: smooth; }
  .home-page { min-height: 100vh; overflow-x: clip; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; }
  .hero-stage { position: relative; height: 142svh; background: #d8e7eb; }
  .hero-scene { position: sticky; top: 0; height: 100svh; overflow: hidden; isolation: isolate; }
  .hero-picture, .hero-picture img, .hero-shade { position: absolute; inset: 0; width: 100%; height: 100%; }
  .hero-picture { z-index: -4; transform: scale(var(--image-scale)); transform-origin: center; }
  .hero-picture img { object-fit: cover; }
  .hero-shade { z-index: -3; background: linear-gradient(90deg, rgba(255,255,255,.96) 0%, rgba(255,255,255,.79) 31%, rgba(255,255,255,.14) 61%, rgba(8,25,40,.34) 100%), linear-gradient(0deg, rgba(6,24,38,.25), transparent 48%); }
  .site-header { position: relative; z-index: 4; display: flex; width: min(1400px, calc(100% - 96px)); height: 92px; margin: 0 auto; align-items: center; justify-content: space-between; }
  .brand { display: inline-flex; align-items: center; gap: 9px; color: #16263e; text-decoration: none; }
  .brand-mark { display: grid; width: 35px; height: 35px; place-items: center; border: 1px solid rgba(21,39,61,.24); border-radius: 50%; color: #24466c; background: rgba(255,255,255,.32); }
  .brand strong { font-family: Georgia, "Yu Mincho", serif; font-size: 24px; font-weight: 500; letter-spacing: .09em; }
  .brand-route { position: relative; display: block; width: 145px; height: 23px; margin-left: 4px; overflow: hidden; }
  .brand-route::before { position: absolute; top: 8px; left: 0; width: 126px; border-top: 2px dotted currentColor; opacity: .52; content: ""; transform: rotate(3deg); }
  .brand-route i { position: absolute; top: 4px; left: 73px; width: 7px; height: 7px; border: 2px solid currentColor; border-radius: 50%; }
  .brand-route b { position: absolute; top: -6px; right: 3px; font-size: 24px; font-weight: 400; transform: rotate(-12deg); }
  nav { display: flex; align-items: center; gap: 30px; }
  nav a { color: #17263d; text-decoration: none; font-size: 12px; font-weight: 800; }
  nav a:hover { text-decoration: underline; text-underline-offset: 5px; }
  .account-link { padding: 12px 20px; border: 1px solid rgba(255,255,255,.8); border-radius: 999px; background: rgba(255,255,255,.92); box-shadow: 0 7px 24px rgba(16,34,50,.12); }
  .menu-button { display: none; }
  .hero-main { display: grid; width: min(1240px, calc(100% - 120px)); height: calc(100svh - 92px); margin: 0 auto; padding: 5vh 0 12vh; grid-template-columns: minmax(0, 1fr) 330px; align-items: center; gap: 90px; transform: translateY(var(--content-y)); opacity: var(--content-opacity); }
  .hero-copy { max-width: 610px; padding-left: 8px; }
  h1 { margin: 0; font-family: Georgia, "Yu Mincho", "Hiragino Mincho ProN", serif; font-size: clamp(47px, 5.3vw, 72px); font-weight: 400; line-height: 1.45; letter-spacing: .065em; }
  .hero-copy > p { margin: 23px 0 30px; font-family: Georgia, "Yu Mincho", serif; font-size: 16px; letter-spacing: .1em; }
  .hero-actions { display: flex; width: 270px; flex-direction: column; gap: 16px; }
  .primary { display: flex; width: 100%; padding: 17px 24px; border: 0; border-radius: 999px; align-items: center; justify-content: center; gap: 36px; color: white; background: var(--accent); box-shadow: 0 13px 32px color-mix(in srgb, var(--accent) 36%, transparent); font: inherit; font-size: 14px; font-weight: 800; cursor: pointer; }
  .primary:hover { filter: brightness(.94); transform: translateY(-1px); }
  .text-link { align-self: center; padding: 4px; border-bottom: 1px solid currentColor; color: #17263d; font-size: 12px; font-weight: 800; text-decoration: none; }
  .quick-facts { display: flex; margin: 34px 0 0; padding: 0; gap: 27px; list-style: none; }
  .quick-facts li { display: flex; align-items: center; gap: 7px; color: #22334b; font-size: 11px; font-weight: 800; }
  .quick-facts span { display: grid; width: 25px; height: 25px; place-items: center; border: 1px solid currentColor; border-radius: 50%; font-size: 9px; }
  .quick-facts .plain-icon { border: 0; border-radius: 0; }
  .quick-facts .plain-icon svg { width: 22px; height: 22px; }
  .preview-area { position: relative; width: 330px; }
  .shiori-preview { display: block; overflow: hidden; border: 1px solid rgba(255,255,255,.9); border-radius: 22px; color: #1d2a40; background: rgba(255,255,255,.96); box-shadow: 0 25px 70px rgba(10,30,45,.28); text-decoration: none; transform: rotate(1.2deg); transition: transform 180ms ease, box-shadow 180ms ease; }
  .shiori-preview:hover { transform: translateY(-6px) rotate(0); box-shadow: 0 30px 82px rgba(10,30,45,.36); }
  .preview-photo { display: block; height: 118px; overflow: hidden; }
  .preview-photo img { width: 100%; height: 100%; object-fit: cover; }
  .preview-body { padding: 15px 20px 11px; }
  .preview-label { display: flex; align-items: center; justify-content: flex-end; }
  .preview-label b { font-size: 20px; font-weight: 400; }
  .preview-body h2 { margin: 10px 0 4px; overflow: hidden; font-family: Georgia, "Yu Mincho", serif; font-size: 17px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
  .preview-body > p { margin: 0 0 14px; color: #778398; font-size: 9px; font-weight: 700; }
  .day-label { display: block; margin-bottom: 7px; font-size: 10px; }
  ol { margin: 0; padding: 0 0 0 19px; border-left: 2px solid color-mix(in srgb, var(--accent) 70%, white); list-style: none; }
  ol li { position: relative; display: grid; min-height: 34px; padding: 3px 0 7px 8px; grid-template-columns: 49px minmax(0, 1fr); align-items: start; font-size: 9px; font-weight: 800; }
  ol li::before { position: absolute; top: 6px; left: -24px; width: 7px; height: 7px; border: 2px solid color-mix(in srgb, var(--accent) 70%, white); border-radius: 50%; background: white; content: ""; }
  ol time { color: #718097; font-size: 8px; }
  ol li span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .preview-tabs { display: flex; padding: 12px 24px 15px; border-top: 1px solid #edf0f4; justify-content: space-between; color: #4c5e78; }
  .preview-tabs span { display: grid; gap: 3px; place-items: center; font-size: 14px; }
  .preview-tabs small { font-size: 7px; font-weight: 800; }
  .tap-note { position: absolute; right: -56px; bottom: -50px; display: flex; align-items: center; color: rgba(255,255,255,.96); font-family: "Yu Mincho", Georgia, serif; transform: rotate(-5deg); }
  .tap-note svg { width: 64px; height: 38px; margin-right: 5px; overflow: visible; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .tap-note svg path:first-child { stroke-dasharray: 4 5 7 4; }
  .tap-note p { margin: 0; font-size: 13px; line-height: 1.6; letter-spacing: .1em; }
  .place-label { position: absolute; right: 27px; bottom: 34px; margin: 0; color: rgba(255,255,255,.9); font-size: 9px; font-weight: 700; letter-spacing: .08em; text-shadow: 0 2px 5px rgba(0,0,0,.5); }
  .scroll-cue { position: absolute; z-index: 5; bottom: 16px; left: 50%; display: grid; width: 38px; height: 38px; padding: 0; border: 0; border-radius: 50%; place-items: center; color: #23354d; background: white; box-shadow: 0 4px 14px rgba(13,32,47,.17); cursor: pointer; transform: translateX(-50%); }
  .scroll-cue span { font-size: 20px; transform: translateY(-2px); }
  .paper-reveal { position: absolute; z-index: 2; right: -10%; bottom: -90px; left: -10%; height: 300px; border-radius: 50% 50% 0 0 / 70px 70px 0 0; background: white; transform: translateY(var(--paper-y)); box-shadow: 0 -12px 34px rgba(18,36,48,.1); }
  .paper-reveal i, .paper-reveal b { position: absolute; top: 42px; width: 120px; border-top: 2px dashed #b9c4d1; opacity: .65; }
  .paper-reveal i { left: 22%; transform: rotate(8deg); }
  .paper-reveal b { right: 18%; transform: rotate(-6deg); }
  .create-section { position: relative; z-index: 3; min-height: 100vh; margin-top: -1px; padding: 78px 20px 110px; background: white; }
  .section-inner { width: min(820px, 100%); margin: 0 auto; }
  .create-heading { margin-bottom: 30px; text-align: center; }
  .create-heading .tiny-route { position: relative; display: block; width: 112px; height: 19px; margin: 0 auto 8px; color: #9aabba; }
  .create-heading .tiny-route i { position: absolute; top: 8px; left: 0; width: 88px; height: 5px; background: radial-gradient(circle, currentColor 1.2px, transparent 1.5px) 0 50% / 9px 5px repeat-x; opacity: .8; transform: rotate(-2deg); }
  .create-heading .tiny-route b { position: absolute; top: -1px; right: 2px; font-size: 17px; font-weight: 400; transform: rotate(7deg); }
  .create-heading p { margin: 0 0 8px; color: #7086a5; font-size: 9px; font-weight: 900; letter-spacing: .2em; }
  .create-heading h2 { margin: 0; font-family: Georgia, "Yu Mincho", serif; font-size: clamp(27px, 4vw, 39px); font-weight: 400; letter-spacing: .06em; }
  .recent-wrapper { margin-top: 42px; }

  @media (max-width: 900px) {
    .site-header { width: calc(100% - 48px); }
    .brand-route { width: 90px; }
    .brand-route::before { width: 75px; }
    .brand-route i { left: 42px; }
    .hero-main { width: calc(100% - 60px); grid-template-columns: minmax(0, 1fr) 285px; gap: 35px; }
    h1 { font-size: clamp(42px, 7vw, 58px); }
    .preview-area { width: 285px; }
    .tap-note { right: -24px; }
  }

  @media (max-width: 640px) {
    .hero-stage { height: 158svh; }
    .hero-picture img { object-position: center !important; }
    .hero-shade { background: linear-gradient(180deg, rgba(10,29,42,.2) 0%, rgba(6,24,37,.48) 55%, rgba(5,22,34,.62) 100%); }
    .site-header { width: calc(100% - 32px); height: 66px; }
    .brand { color: white; text-shadow: 0 1px 5px rgba(0,0,0,.3); }
    .brand-mark { width: 31px; height: 31px; border-color: rgba(255,255,255,.72); color: white; }
    .brand strong { font-size: 18px; }
    .brand-route { width: 89px; height: 20px; }
    nav { position: absolute; top: 58px; right: 0; display: none; width: 190px; padding: 12px; border-radius: 15px; align-items: stretch; flex-direction: column; gap: 2px; background: rgba(255,255,255,.96); box-shadow: 0 14px 40px rgba(12,29,42,.24); }
    nav.open { display: flex; }
    nav a { padding: 11px 12px; }
    .account-link { border: 0; border-radius: 9px; box-shadow: none; background: #f1f5f8; }
    .menu-button { display: grid; width: 34px; height: 34px; padding: 0; border: 0; border-radius: 50%; place-items: center; color: #1c3049; background: rgba(255,255,255,.94); font-size: 17px; cursor: pointer; }
    .menu-button.open { font-size: 22px; }
    .hero-main { display: flex; width: calc(100% - 38px); height: calc(100svh - 66px); padding: 6vh 0 20px; align-items: stretch; flex-direction: column; gap: 21px; }
    .hero-copy { padding: 0; color: white; text-shadow: 0 2px 9px rgba(0,0,0,.28); }
    h1 { font-size: clamp(34px, 10.8vw, 44px); line-height: 1.42; }
    .hero-copy > p { margin: 10px 0 17px; font-size: 12px; }
    .hero-actions { width: 100%; gap: 11px; }
    .primary { padding: 13px 21px; box-shadow: 0 10px 28px rgba(5,20,31,.25); }
    .text-link { color: white; font-size: 10px; }
    .quick-facts { margin-top: 15px; justify-content: space-between; gap: 7px; }
    .quick-facts li { color: white; font-size: 9px; }
    .quick-facts span { width: 22px; height: 22px; }
    .preview-area { width: min(100%, 320px); margin: auto auto 0; }
    .shiori-preview { border-radius: 18px 18px 0 0; transform: none; }
    .preview-photo { display: none; }
    .preview-body { padding: 13px 17px 8px; }
    .preview-body h2 { margin-top: 8px; font-size: 15px; }
    .preview-body > p { margin-bottom: 10px; }
    ol { display: grid; grid-template-columns: 1fr 1fr; gap: 0 8px; }
    ol li { min-height: 29px; padding-bottom: 4px; grid-template-columns: 39px minmax(0, 1fr); font-size: 7px; }
    .preview-tabs { padding: 9px 25px 11px; }
    .tap-note { right: -1px; bottom: -37px; color: white; }
    .tap-note svg { width: 45px; }
    .tap-note p { font-size: 9px; }
    .place-label { display: none; }
    .scroll-cue { display: none; }
    .paper-reveal { bottom: -100px; height: 290px; }
    .create-section { padding: 62px 16px 82px; }
  }

  @media (max-height: 720px) and (max-width: 640px) {
    .hero-main { padding-top: 1.5vh; gap: 10px; }
    h1 { font-size: 31px; }
    .hero-copy > p { margin: 5px 0 10px; }
    .primary { padding: 10px 18px; }
    .quick-facts { margin-top: 9px; }
    .preview-body ol li:nth-child(n+3) { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(html) { scroll-behavior: auto; }
    .hero-picture, .hero-main, .paper-reveal { transform: none; }
    .shiori-preview, .primary { transition: none; }
  }
</style>
