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

  type HeroImage = { id: string; place: string; position: string };
  const heroImages: HeroImage[] = [
    { id: "iya", place: "祖谷渓・徳島", position: "center 45%" },
    { id: "kamikochi", place: "上高地・長野", position: "center 52%" },
    { id: "oirase", place: "奥入瀬渓流・青森", position: "center 50%" },
  ];

  let heroImage = $state<HeroImage | null>(null);
  let loggedIn = $state(false);
  let recentItineraries = $state<Array<{ id: string; title: string; visitedAt: number }>>([]);

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
    heroImage = heroImages[Math.floor(Math.random() * heroImages.length)];
  });
</script>

<svelte:head>
  <title>たびたび - 旅のしおりを作って、かんたん共有</title>
  <meta name="description" content="旅の予定をひとつにまとめて、URLでかんたん共有。登録不要・無料で使える旅のしおり作成サービスです。" />
  <link rel="canonical" href="https://tabitabi.pages.dev/" />
  <meta property="og:title" content="たびたび - 旅のしおりを作って、かんたん共有" />
  <meta property="og:description" content="旅の予定をひとつにまとめて、URLでかんたん共有。" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tabitabi.pages.dev/" />
  <meta property="og:image" content="https://tabitabi.pages.dev/og-image.png" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:site_name" content="たびたび" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="たびたび - 旅のしおりを作って、かんたん共有" />
  <meta name="twitter:description" content="旅の予定をひとつにまとめて、URLでかんたん共有。" />
  <meta name="twitter:image" content="https://tabitabi.pages.dev/og-image.png" />
</svelte:head>

<div class="home-page">
  <section class="hero" aria-labelledby="hero-title">
    {#if heroImage}
      <picture class="hero-picture">
        <source srcset="/hero/{heroImage.id}.avif" type="image/avif" />
        <source srcset="/hero/{heroImage.id}.webp" type="image/webp" />
        <img src="/hero/{heroImage.id}.webp" alt="{heroImage.place}の風景" style:object-position={heroImage.position} />
      </picture>
    {/if}
    <div class="hero-shade"></div>

    <header class="site-header">
      <a class="brand" href="/" aria-label="たびたび ホーム">
        <span class="brand-mark"><IconAirplane size={24} /></span><strong>たびたび</strong>
      </a>
      <nav aria-label="サイトナビゲーション">
        <a href="/explore">みんなのしおり</a>
        <a class="account-link" href="/profile">{loggedIn ? "マイページ" : "ログイン"}</a>
      </nav>
    </header>

    <div class="hero-inner">
      <div class="hero-copy">
        <p class="eyebrow">旅の予定を、ひとつに。</p>
        <h1 id="hero-title">旅のしおりで、<br />旅はもっと自由になる。</h1>
        <p class="lead">予定をまとめて、URLでかんたんに共有しよう。</p>
        <div class="hero-actions">
          <button class="primary" onclick={scrollToCreate}>無料でしおりを作る <span aria-hidden="true">→</span></button>
          <a class="secondary" href="/explore">みんなのしおりを見る</a>
        </div>
        <ul class="quick-facts" aria-label="サービスの特徴">
          <li><span aria-hidden="true">○</span>登録不要</li>
          <li><span aria-hidden="true">¥0</span>無料</li>
          <li><span aria-hidden="true">↗</span>URLで共有</li>
        </ul>
      </div>

      <a class="shiori-preview" href="/explore" aria-label="公開しおりの完成イメージを見る">
        <div class="preview-photo" aria-hidden="true"></div>
        <div class="preview-head">
          <div><small>2泊3日・徳島</small><strong>祖谷の秘境旅</strong></div><span>⌄</span>
        </div>
        <ol>
          <li><time>10:00</time><span>祖谷のかずら橋</span></li>
          <li><time>13:00</time><span>山あいで郷土料理</span></li>
          <li><time>15:30</time><span>大歩危峡クルーズ</span></li>
          <li><time>18:00</time><span>渓谷の宿でゆっくり</span></li>
        </ol>
        <div class="preview-tabs"><span>マップ</span><span>メモ</span><span>写真</span></div>
      </a>
    </div>
    {#if heroImage}<p class="place-label">{heroImage.place}</p>{/if}
  </section>

  <section id="create" class="create-section" aria-labelledby="create-title">
    <div class="section-inner">
      <div class="create-heading"><p>CREATE</p><h2 id="create-title">次の旅のしおりを作る</h2></div>
      <CreateForm />
      {#if recentItineraries.length > 0}
        <div class="recent-wrapper"><RecentItineraries items={recentItineraries} onRemove={removeRecent} /></div>
      {/if}
    </div>
  </section>
  <Footer />
</div>

<style>
  :global(body) { margin: 0; color: #17233c; background: #f8f9fb; }
  :global(*) { box-sizing: border-box; }
  .home-page { min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; }
  .hero { position: relative; min-height: 100svh; overflow: hidden; background: #cfe5f1; isolation: isolate; }
  .hero-picture, .hero-picture img, .hero-shade { position: absolute; inset: 0; width: 100%; height: 100%; }
  .hero-picture { z-index: -3; }
  .hero-picture img { object-fit: cover; }
  .hero-shade { z-index: -2; background: linear-gradient(90deg, rgba(250,252,253,.97) 0%, rgba(250,252,253,.89) 34%, rgba(250,252,253,.2) 68%, rgba(14,37,53,.16) 100%), linear-gradient(0deg, rgba(9,32,48,.2), transparent 42%); }
  .site-header { display: flex; width: min(1320px, calc(100% - 64px)); height: 88px; margin: 0 auto; align-items: center; justify-content: space-between; }
  .brand { display: inline-flex; align-items: center; gap: 10px; color: #17233c; text-decoration: none; }
  .brand-mark { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid rgba(22,52,75,.18); border-radius: 50%; color: #2e75bc; background: rgba(255,255,255,.82); }
  .brand strong { font-family: Georgia, "Yu Mincho", serif; font-size: 24px; letter-spacing: .08em; }
  nav { display: flex; align-items: center; gap: 34px; }
  nav a { color: #17233c; text-decoration: none; font-size: 13px; font-weight: 750; }
  nav a:hover { text-decoration: underline; text-underline-offset: 5px; }
  .account-link { padding: 11px 18px; border-radius: 999px; background: rgba(255,255,255,.78); box-shadow: 0 4px 18px rgba(25,45,61,.08); }
  .hero-inner { display: grid; width: min(1200px, calc(100% - 80px)); min-height: calc(100svh - 132px); margin: 0 auto; padding: 7vh 0 9vh; grid-template-columns: minmax(0, 1fr) 340px; align-items: center; gap: 80px; }
  .hero-copy { max-width: 650px; }
  .eyebrow { margin: 0 0 18px; color: #447aa1; font-size: 12px; font-weight: 850; letter-spacing: .18em; }
  h1 { margin: 0; font-family: Georgia, "Yu Mincho", "Hiragino Mincho ProN", serif; font-size: clamp(42px, 5.1vw, 70px); font-weight: 500; line-height: 1.52; letter-spacing: .055em; }
  .lead { margin: 24px 0 30px; color: #45536a; font-size: 16px; line-height: 1.8; }
  .hero-actions { display: flex; align-items: center; gap: 14px; }
  .hero-actions button, .hero-actions a { min-width: 220px; padding: 15px 22px; border-radius: 999px; font: inherit; font-size: 14px; font-weight: 800; text-align: center; text-decoration: none; cursor: pointer; }
  .primary { display: inline-flex; border: 0; align-items: center; justify-content: space-between; color: white; background: #1767d5; box-shadow: 0 10px 28px rgba(17,87,184,.25); }
  .primary:hover { background: #105bbf; }
  .secondary { border: 1px solid #1767d5; color: #155ebf; background: rgba(255,255,255,.78); }
  .secondary:hover { background: white; }
  .quick-facts { display: flex; margin: 28px 0 0; padding: 0; gap: 26px; list-style: none; }
  .quick-facts li { display: flex; align-items: center; gap: 7px; color: #283a52; font-size: 12px; font-weight: 800; }
  .quick-facts span { display: grid; width: 25px; height: 25px; place-items: center; border: 1px solid #a9c8eb; border-radius: 50%; color: #1263cd; background: rgba(255,255,255,.76); font-size: 9px; }
  .shiori-preview { overflow: hidden; border: 1px solid rgba(255,255,255,.76); border-radius: 24px; color: #1d2b42; background: rgba(255,255,255,.94); box-shadow: 0 25px 70px rgba(14,39,57,.24); text-decoration: none; transform: rotate(1deg); transition: transform 180ms ease, box-shadow 180ms ease; }
  .shiori-preview:hover { transform: translateY(-5px) rotate(0); box-shadow: 0 30px 80px rgba(14,39,57,.3); }
  .preview-photo { height: 118px; background: radial-gradient(circle at 74% 33%, rgba(255,255,255,.72) 0 22px, transparent 23px), linear-gradient(155deg, #d9edf5 0%, #88bbc4 42%, #4f8c72 43%, #235d49 100%); }
  .preview-head { display: flex; padding: 18px 20px 12px; align-items: center; justify-content: space-between; }
  .preview-head div { display: flex; flex-direction: column-reverse; gap: 4px; }
  .preview-head small { color: #748094; font-size: 9px; }
  .preview-head strong { font-family: Georgia, "Yu Mincho", serif; font-size: 19px; }
  .preview-head > span { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 50%; color: #3a69a8; background: #eef5fb; }
  ol { margin: 0 20px 15px; padding: 0 0 0 22px; border-left: 2px solid #d7a9a9; list-style: none; }
  ol li { position: relative; display: grid; padding: 8px 0 8px 10px; grid-template-columns: 50px 1fr; font-size: 10px; font-weight: 750; }
  ol li::before { position: absolute; top: 11px; left: -27px; width: 8px; height: 8px; border: 2px solid #d7a9a9; border-radius: 50%; background: white; content: ""; }
  ol time { color: #758196; font-size: 9px; }
  .preview-tabs { display: flex; padding: 13px 30px 16px; border-top: 1px solid #edf0f4; justify-content: space-between; color: #657187; font-size: 9px; font-weight: 800; }
  .place-label { position: absolute; right: 25px; bottom: 18px; margin: 0; color: rgba(255,255,255,.88); font-size: 10px; letter-spacing: .12em; text-shadow: 0 1px 5px rgba(0,0,0,.4); }
  .create-section { padding: 90px 20px 110px; background: #f8f9fb; }
  .section-inner { width: min(920px, 100%); margin: 0 auto; }
  .create-heading { margin-bottom: 30px; text-align: center; }
  .create-heading p { margin: 0 0 8px; color: #4c76aa; font-size: 10px; font-weight: 900; letter-spacing: .2em; }
  .create-heading h2 { margin: 0; font-family: Georgia, "Yu Mincho", serif; font-size: clamp(26px, 4vw, 38px); font-weight: 500; }
  .recent-wrapper { margin-top: 42px; }
  @media (max-width: 900px) {
    .hero-inner { width: min(720px, calc(100% - 44px)); grid-template-columns: minmax(0, 1fr) 260px; gap: 28px; }
    .hero-shade { background: linear-gradient(90deg, rgba(250,252,253,.96) 0%, rgba(250,252,253,.78) 52%, rgba(20,43,58,.15) 100%); }
    h1 { font-size: clamp(38px, 6vw, 56px); }
    .hero-actions { align-items: stretch; flex-direction: column; }
    .hero-actions button, .hero-actions a { width: 100%; min-width: 0; }
  }
  @media (max-width: 640px) {
    .hero-picture img { object-position: 61% center !important; }
    .hero-shade { background: linear-gradient(180deg, rgba(244,249,252,.9) 0%, rgba(244,249,252,.76) 51%, rgba(9,35,52,.35) 100%); }
    .site-header { width: calc(100% - 32px); height: 64px; }
    .brand { gap: 7px; } .brand-mark { width: 31px; height: 31px; } .brand strong { font-size: 18px; }
    nav { gap: 13px; } nav a { font-size: 11px; } .account-link { padding: 8px 11px; }
    .hero-inner { display: flex; width: calc(100% - 36px); min-height: calc(100svh - 64px); padding: 4vh 0 22px; align-items: stretch; flex-direction: column; gap: 22px; }
    .eyebrow { margin-bottom: 10px; font-size: 9px; }
    h1 { font-size: clamp(30px, 9.1vw, 39px); line-height: 1.47; letter-spacing: .035em; }
    .lead { margin: 12px 0 17px; font-size: 12px; }
    .hero-actions { gap: 9px; } .hero-actions button, .hero-actions a { padding: 12px 18px; font-size: 12px; }
    .quick-facts { margin-top: 16px; justify-content: space-between; gap: 6px; }
    .quick-facts li { gap: 5px; font-size: 10px; } .quick-facts span { width: 22px; height: 22px; }
    .shiori-preview { width: min(100%, 315px); margin: auto auto 0; border-radius: 18px; transform: none; }
    .preview-photo { display: none; } .preview-head { padding: 13px 16px 7px; } .preview-head strong { font-size: 15px; }
    ol { display: grid; margin: 0 16px 9px; padding-left: 15px; grid-template-columns: 1fr 1fr; gap: 0 10px; }
    ol li { padding: 5px 0 5px 6px; grid-template-columns: 38px 1fr; font-size: 8px; }
    ol li::before { top: 8px; left: -20px; width: 6px; height: 6px; }
    .preview-tabs { padding: 9px 26px 11px; } .place-label { display: none; }
    .create-section { padding: 64px 16px 80px; }
  }
  @media (max-height: 720px) and (max-width: 640px) {
    .hero-inner { padding-top: 1vh; gap: 12px; }
    .eyebrow, .quick-facts, .shiori-preview { display: none; }
    .lead { margin: 8px 0 12px; }
  }
</style>
