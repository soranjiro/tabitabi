<script lang="ts">
  import { goto } from "$app/navigation";
  import ItineraryCard from "./ItineraryCard.svelte";
  import PublicFooter from "./PublicFooter.svelte";
  import PublicHeader from "./PublicHeader.svelte";
  import type { PublicItineraryDetail } from "./data";
  import { publicItineraries } from "./data";

  let { itinerary }: { itinerary: PublicItineraryDetail } = $props();

  let shareOpen = $state(false);
  let copyOpen = $state(false);
  let copied = $state(false);
  let activeDay = $state(1);

  const related = $derived(
    publicItineraries
      .filter(
        (item) =>
          item.id !== itinerary.id &&
          item.prefectureSlugs.some((slug) => itinerary.prefectureSlugs.includes(slug)),
      )
      .slice(0, 4),
  );

  const shareUrl = $derived(`https://tabitabi.pages.dev/itineraries/${itinerary.id}`);
  const encodedShareUrl = $derived(encodeURIComponent(shareUrl));
  const encodedShareText = $derived(encodeURIComponent(`${itinerary.title}｜たびたび`));

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      copied = false;
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      await navigator.share({ title: itinerary.title, text: itinerary.description, url: shareUrl });
      shareOpen = false;
    } else {
      await copyUrl();
    }
  }

  function openCopy() {
    copyOpen = true;
    document.body.style.overflow = "hidden";
  }

  function closeCopy() {
    copyOpen = false;
    document.body.style.overflow = "";
  }

  function startCopy() {
    document.body.style.overflow = "";
    goto("/itineraries/copied-kyoto/edit?copied=1");
  }

  function jumpToDay(day: number) {
    activeDay = day;
    document.getElementById(`day-${day}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function kindLabel(kind: string) {
    return {
      move: "移動",
      food: "食事",
      sight: "観光",
      stay: "宿泊",
      shop: "買物",
    }[kind] ?? "予定";
  }
</script>

<svelte:head>
  <title>{itinerary.title}｜旅行しおり - たびたび</title>
  <meta name="description" content="{itinerary.description} {itinerary.dateRange}の旅行プランです。" />
  <link rel="canonical" href="https://tabitabi.pages.dev/itineraries/{itinerary.id}" />
  <meta property="og:title" content="{itinerary.title}｜たびたび" />
  <meta property="og:description" content={itinerary.description} />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="https://tabitabi.pages.dev/itineraries/{itinerary.id}" />
  <meta property="og:image" content="https://tabitabi.pages.dev/og.png" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<div class="detail-page">
  <PublicHeader active="explore" />

  <div class="breadcrumb-wrap">
    <nav class="breadcrumb" aria-label="パンくずリスト">
      <a href="/">ホーム</a><span>›</span><a href="/explore">みんなのしおり</a><span>›</span>
      <a href="/area/{itinerary.prefectureSlugs[0]}">{itinerary.prefectures[0]}</a><span>›</span><strong>旅行しおり</strong>
    </nav>
  </div>

  <header class="detail-hero">
    <div class="hero-inner">
      <div class="hero-copy">
        <div class="hero-tags">
          <span>公開しおり</span>
          {#each itinerary.prefectures as prefecture, index}
            <a href="/area/{itinerary.prefectureSlugs[index]}">⌖ {prefecture}</a>
          {/each}
        </div>
        <h1>{itinerary.title}</h1>
        <p class="hero-intro">{itinerary.intro}</p>
        <div class="hero-meta">
          <a class="author" href="/users/{itinerary.author}">
            <span>{itinerary.authorInitial}</span>
            <div><small>CREATED BY</small><strong>@{itinerary.author}</strong></div>
          </a>
          <i aria-hidden="true"></i>
          <div class="date-meta"><small>TRAVEL DATE</small><strong>{itinerary.dateRange}</strong></div>
        </div>
      </div>

      <div class="hero-art" aria-hidden="true">
        <div class="ticket-top"><span>TABITABI JOURNAL</span><b>No. 026</b></div>
        <div class="art-scene">
          <span class="art-sun"></span>
          <span class="art-mountain mountain-one"></span>
          <span class="art-mountain mountain-two"></span>
          <span class="art-stamp">京</span>
          <span class="art-route">KYOTO → OSAKA</span>
        </div>
        <div class="ticket-bottom">
          <span>3 DAYS · 12 SPOTS</span>
          <span class="barcode">▥▥▥ ▥▥ ▥▥▥</span>
        </div>
      </div>
    </div>
  </header>

  <div class="action-bar">
    <div>
      <div class="day-pills" aria-label="日程へ移動">
        {#each itinerary.days as day}
          <button class:active={activeDay === day.day} onclick={() => jumpToDay(day.day)}>DAY {day.day}</button>
        {/each}
      </div>
      <div class="action-buttons">
        <button class="share-button" onclick={() => (shareOpen = !shareOpen)} aria-expanded={shareOpen}>
          <span aria-hidden="true">↗</span> 共有する
        </button>
        <button class="copy-button" onclick={openCopy}><span aria-hidden="true">＋</span> このしおりをコピーして使う</button>
        {#if shareOpen}
          <div class="share-menu">
            <p>このしおりを共有</p>
            <button onclick={copyUrl}><span aria-hidden="true">⎘</span>{copied ? "コピーしました" : "URLをコピー"}</button>
            <a href="https://x.com/intent/post?url={encodedShareUrl}&text={encodedShareText}" target="_blank" rel="noreferrer"><span>𝕏</span>Xで共有</a>
            <a href="https://social-plugins.line.me/lineit/share?url={encodedShareUrl}" target="_blank" rel="noreferrer"><span>LINE</span>LINEで送る</a>
            <button onclick={nativeShare}><span aria-hidden="true">⌁</span>端末の共有を使う</button>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <main>
    <div class="content-grid section-wrap">
      <article class="itinerary-content">
        <div class="content-heading">
          <p>THE ITINERARY</p>
          <h2>この旅のスケジュール</h2>
          <span>{itinerary.stops}の予定 · {itinerary.duration}</span>
        </div>

        {#each itinerary.days as day}
          <section id="day-{day.day}" class="day-section" aria-labelledby="day-title-{day.day}">
            <header>
              <span class="day-number">0{day.day}</span>
              <div>
                <p>{day.date}</p>
                <h3 id="day-title-{day.day}">{day.label}</h3>
              </div>
            </header>

            <div class="timeline">
              {#each day.steps as step, index}
                <div class="timeline-item">
                  <time>{step.time}</time>
                  <span class="timeline-dot {step.kind}" aria-hidden="true"></span>
                  <div class="step-card">
                    <div class="step-top">
                      <span class="kind">{kindLabel(step.kind)}</span>
                      <small>STEP {String(index + 1).padStart(2, "0")}</small>
                    </div>
                    <h4>{step.title}</h4>
                    <p class="location">⌖ {step.location}</p>
                    {#if step.note}<p class="note">{step.note}</p>{/if}
                  </div>
                </div>
              {/each}
            </div>
          </section>
        {/each}
      </article>

      <aside class="side-column">
        <section class="trip-summary">
          <p class="side-label">TRIP OVERVIEW</p>
          <dl>
            <div><dt>日程</dt><dd>{itinerary.duration}</dd></div>
            <div><dt>旅先</dt><dd>{itinerary.prefectures.join("・")}</dd></div>
            <div><dt>予定</dt><dd>{itinerary.stops}スポット</dd></div>
            <div><dt>更新</dt><dd>{itinerary.updatedAt}</dd></div>
          </dl>
        </section>

        <section class="memo-card">
          <span class="memo-clip" aria-hidden="true"></span>
          <p class="side-label">TRAVEL MEMO</p>
          <h3>旅した人からのメモ</h3>
          <p>{itinerary.memo}</p>
        </section>

        <section class="copy-side-card">
          <span aria-hidden="true">＋</span>
          <h3>この旅をベースに<br />しおりを作れます</h3>
          <p>予定やメモをコピーして、自分の旅に合わせて編集できます。</p>
          <button onclick={openCopy}>コピーして使う →</button>
        </section>

        <section class="area-links">
          <p class="side-label">MORE IN THIS AREA</p>
          {#each itinerary.prefectures as prefecture, index}
            <a href="/area/{itinerary.prefectureSlugs[index]}">{prefecture}の他のしおりを見る <span>→</span></a>
          {/each}
        </section>
      </aside>
    </div>

    <section class="related-section" aria-labelledby="related-title">
      <div class="section-wrap">
        <div class="related-heading">
          <div>
            <p>MORE TRIP IDEAS</p>
            <h2 id="related-title">この旅行先の他のしおり</h2>
          </div>
          <a href="/area/{itinerary.prefectureSlugs[0]}">すべて見る <span>→</span></a>
        </div>
        <div class="related-grid">
          {#each related as item}
            <ItineraryCard itinerary={item} compact />
          {/each}
        </div>
      </div>
    </section>
  </main>

  <PublicFooter />
</div>

{#if copyOpen}
  <div
    class="modal-backdrop"
    role="presentation"
    onclick={(event) => event.target === event.currentTarget && closeCopy()}
  >
    <div class="copy-modal" role="dialog" aria-modal="true" aria-labelledby="copy-modal-title">
      <button class="modal-close" onclick={closeCopy} aria-label="閉じる">×</button>
      <div class="modal-icon" aria-hidden="true"><span>＋</span></div>
      <p class="modal-kicker">MAKE IT YOURS</p>
      <h2 id="copy-modal-title">このしおりを<br />自分の旅にコピーしますか？</h2>
      <p class="modal-description">旅程、メモ、テーマ、旅行先を引き継いで、新しいしおりを作ります。</p>
      <div class="copy-preview">
        <span class="preview-stamp">京</span>
        <div><small>COPY FROM</small><strong>{itinerary.title}</strong><p>{itinerary.duration} · {itinerary.stops}スポット</p></div>
      </div>
      <div class="privacy-note"><span aria-hidden="true">⌁</span><div><strong>コピー後は「非公開」です</strong><p>作成者や公開情報は引き継がれません。いつでも公開設定を変更できます。</p></div></div>
      <button class="modal-primary" onclick={startCopy}>コピーして編集をはじめる <span>→</span></button>
      <button class="modal-secondary" onclick={closeCopy}>今はしない</button>
    </div>
  </div>
{/if}

<style>
  :global(body) { background: #fffdf8; }
  .detail-page { min-height: 100vh; color: #203d3f; background: #fffdf8; font-family: "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", sans-serif; }
  .breadcrumb-wrap { background: #fbf8f1; }
  .breadcrumb { display: flex; align-items: center; gap: 8px; width: min(1120px, calc(100% - 40px)); height: 47px; margin: 0 auto; overflow: hidden; color: #99a4a2; font-size: 9px; white-space: nowrap; }
  .breadcrumb a { color: #718684; text-decoration: none; }
  .breadcrumb strong { overflow: hidden; color: #536d6c; font-weight: 700; text-overflow: ellipsis; }
  .detail-hero { position: relative; overflow: hidden; padding: 73px 20px 76px; background: linear-gradient(180deg, #fffdf8, #faf5ec); }
  .hero-inner { display: grid; grid-template-columns: minmax(0, 1fr) 360px; align-items: center; gap: 80px; width: min(1050px, 100%); margin: 0 auto; }
  .hero-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 20px; }
  .hero-tags span, .hero-tags a { padding: 6px 9px; border-radius: 999px; color: #c7584b; background: #fff0e7; text-decoration: none; font-size: 9px; font-weight: 800; }
  .hero-tags span { color: white; background: #173f42; }
  h1 { margin: 0; color: #183f42; font-family: "Hiragino Mincho ProN", "Yu Mincho", serif; font-size: clamp(34px, 5vw, 53px); font-weight: 600; line-height: 1.45; letter-spacing: .03em; }
  .hero-intro { max-width: 630px; margin: 22px 0 28px; color: #667978; font-size: 13px; line-height: 2; }
  .hero-meta { display: flex; align-items: center; gap: 18px; }
  .hero-meta > i { width: 1px; height: 34px; background: #d9ded8; }
  .author { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; }
  .author > span { display: grid; width: 39px; height: 39px; place-items: center; border-radius: 50%; color: white; background: #dd7565; font-size: 12px; font-weight: 800; }
  .author div, .date-meta { display: flex; flex-direction: column; gap: 4px; }
  .hero-meta small { color: #99a4a1; font-size: 7px; font-weight: 900; letter-spacing: .13em; }
  .hero-meta strong { color: #3f5b5c; font-size: 10px; font-weight: 800; }
  .hero-art { position: relative; padding: 14px; border: 1px solid #dde0d9; background: #fffef9; box-shadow: 0 22px 48px rgba(45, 72, 68, .13); transform: rotate(1.4deg); }
  .ticket-top, .ticket-bottom { display: flex; align-items: center; justify-content: space-between; height: 28px; color: #82918e; font-size: 7px; font-weight: 800; letter-spacing: .12em; }
  .art-scene { position: relative; height: 230px; overflow: hidden; background: linear-gradient(145deg, #ffe8d3, #eab393 60%, #cb7768); }
  .art-sun { position: absolute; left: 34px; top: 34px; width: 70px; height: 70px; border-radius: 50%; background: rgba(255,255,238,.82); box-shadow: 0 0 0 18px rgba(255,255,255,.12); }
  .art-mountain { position: absolute; border-radius: 52% 48% 0 0; }
  .mountain-one { right: -70px; bottom: -118px; width: 290px; height: 260px; background: #c8685b; transform: rotate(-8deg); }
  .mountain-two { left: -70px; bottom: -145px; width: 300px; height: 250px; background: rgba(255,243,210,.57); transform: rotate(9deg); }
  .art-stamp { position: absolute; right: 27px; top: 26px; display: grid; width: 58px; height: 58px; place-items: center; border: 2px solid rgba(255,255,255,.8); border-radius: 50%; color: white; background: rgba(183,72,61,.5); font-family: serif; font-size: 27px; }
  .art-route { position: absolute; left: 18px; bottom: 15px; color: rgba(255,255,255,.85); font-size: 7px; font-weight: 900; letter-spacing: .17em; }
  .barcode { letter-spacing: -.05em; }
  .action-bar { position: sticky; z-index: 20; top: 0; border-top: 1px solid #eceae4; border-bottom: 1px solid #e2e4de; background: rgba(255, 255, 252, .94); backdrop-filter: blur(14px); }
  .action-bar > div { display: flex; align-items: center; justify-content: space-between; width: min(1050px, calc(100% - 40px)); min-height: 67px; margin: 0 auto; }
  .day-pills, .action-buttons { display: flex; align-items: center; gap: 7px; }
  .day-pills button { border: 0; border-radius: 999px; padding: 8px 11px; color: #899693; background: transparent; font-size: 8px; font-weight: 900; cursor: pointer; }
  .day-pills button.active { color: white; background: #315657; }
  .action-buttons { position: relative; }
  .share-button, .copy-button { border: 0; border-radius: 999px; padding: 11px 16px; font-size: 10px; font-weight: 800; cursor: pointer; }
  .share-button { color: #3d5d5d; background: #edf2ed; }
  .copy-button { color: white; background: #df6757; box-shadow: 0 7px 18px rgba(219, 95, 78, .18); }
  .share-menu { position: absolute; right: 0; top: calc(100% + 12px); width: 220px; overflow: hidden; padding: 9px; border: 1px solid #dde2dc; border-radius: 15px; background: white; box-shadow: 0 16px 38px rgba(37, 64, 60, .16); }
  .share-menu p { margin: 5px 7px 8px; color: #879593; font-size: 9px; font-weight: 800; }
  .share-menu button, .share-menu a { display: flex; width: 100%; align-items: center; gap: 9px; padding: 10px; border: 0; border-radius: 8px; color: #355758; background: transparent; text-decoration: none; font-size: 10px; font-weight: 700; cursor: pointer; }
  .share-menu button:hover, .share-menu a:hover { background: #f1f5ef; }
  .share-menu span { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 8px; color: #274b4d; background: #e9f0eb; font-size: 9px; }
  .section-wrap { width: min(1050px, calc(100% - 40px)); margin: 0 auto; }
  .content-grid { display: grid; grid-template-columns: minmax(0, 1fr) 265px; gap: 64px; padding-top: 85px; padding-bottom: 110px; }
  .content-heading p, .side-label, .related-heading p { margin: 0 0 10px; color: #d26152; font-size: 8px; font-weight: 900; letter-spacing: .18em; }
  .content-heading h2, .related-heading h2 { margin: 0; color: #214748; font-family: "Yu Mincho", serif; font-size: clamp(27px, 4vw, 36px); }
  .content-heading > span { display: block; margin-top: 9px; color: #8b9895; font-size: 10px; }
  .day-section { padding-top: 59px; scroll-margin-top: 84px; }
  .day-section > header { display: flex; align-items: center; gap: 17px; margin-bottom: 28px; }
  .day-number { display: grid; width: 55px; height: 55px; place-items: center; border-radius: 15px 15px 15px 4px; color: white; background: #173f42; font-family: Georgia, serif; font-size: 21px; }
  .day-section header p { margin: 0 0 4px; color: #dc6d5e; font-size: 8px; font-weight: 900; letter-spacing: .12em; }
  .day-section header h3 { margin: 0; color: #2a4d4e; font-family: "Yu Mincho", serif; font-size: 21px; }
  .timeline { position: relative; }
  .timeline::before { position: absolute; left: 83px; top: 15px; bottom: 20px; width: 1px; content: ""; background: #dce4dd; }
  .timeline-item { position: relative; display: grid; grid-template-columns: 62px 20px minmax(0, 1fr); gap: 11px; align-items: start; margin-bottom: 13px; }
  .timeline-item time { padding-top: 21px; color: #35595a; font-family: Georgia, serif; font-size: 13px; text-align: right; }
  .timeline-dot { z-index: 2; width: 9px; height: 9px; margin: 23px auto 0; border: 3px solid #fffdf8; border-radius: 50%; background: #5f8a82; box-shadow: 0 0 0 1px #aec3bc; }
  .timeline-dot.food { background: #e26d5c; }
  .timeline-dot.move { background: #748da6; }
  .timeline-dot.stay { background: #9276a1; }
  .timeline-dot.shop { background: #d39c3d; }
  .step-card { padding: 17px 19px; border: 1px solid #e5e7e0; border-radius: 14px; background: white; box-shadow: 0 7px 24px rgba(41, 66, 62, .05); }
  .step-top { display: flex; align-items: center; justify-content: space-between; }
  .kind { padding: 4px 7px; border-radius: 999px; color: #c45a4c; background: #fff0e8; font-size: 8px; font-weight: 800; }
  .step-top small { color: #b0b8b5; font-size: 7px; font-weight: 800; letter-spacing: .1em; }
  .step-card h4 { margin: 10px 0 6px; color: #27494a; font-size: 14px; }
  .location { margin: 0; color: #7d8d8b; font-size: 9px; }
  .note { margin: 12px 0 0; padding: 9px 11px; border-left: 2px solid #e48a7b; color: #768584; background: #faf8f2; font-size: 9px; line-height: 1.6; }
  .side-column { padding-top: 2px; }
  .side-column section { margin-bottom: 17px; padding: 22px; border: 1px solid #e1e5de; border-radius: 16px; background: white; }
  .trip-summary dl { margin: 4px 0 0; }
  .trip-summary dl div { display: flex; justify-content: space-between; gap: 12px; padding: 11px 0; border-bottom: 1px solid #eff0eb; font-size: 10px; }
  .trip-summary dl div:last-child { border-bottom: 0; }
  .trip-summary dt { color: #8b9895; }
  .trip-summary dd { margin: 0; color: #39595a; font-weight: 800; text-align: right; }
  .side-column .memo-card { position: relative; padding-top: 28px; background: #fff8df; transform: rotate(-1deg); }
  .memo-clip { position: absolute; top: -7px; left: 50%; width: 65px; height: 18px; background: rgba(226,194,144,.48); transform: translateX(-50%) rotate(2deg); }
  .memo-card h3, .copy-side-card h3 { margin: 8px 0 12px; color: #3b5957; font-family: "Yu Mincho", serif; font-size: 16px; }
  .memo-card > p:last-child, .copy-side-card p { margin: 0; color: #6f7f7c; font-size: 10px; line-height: 1.9; }
  .side-column .copy-side-card { color: white; background: #e16b5a; border-color: #e16b5a; }
  .copy-side-card > span { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid rgba(255,255,255,.5); border-radius: 50%; }
  .copy-side-card h3, .copy-side-card p { color: white; }
  .copy-side-card p { color: rgba(255,255,255,.82); }
  .copy-side-card button { width: 100%; margin-top: 18px; padding: 11px; border: 0; border-radius: 9px; color: #bc4e42; background: white; font-size: 9px; font-weight: 900; cursor: pointer; }
  .area-links a { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #edf0eb; color: #466666; text-decoration: none; font-size: 9px; font-weight: 800; }
  .area-links a:last-child { border-bottom: 0; }
  .related-section { padding: 90px 0 105px; background: #f0f4ed; }
  .related-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; margin-bottom: 30px; }
  .related-heading > a { padding-bottom: 4px; border-bottom: 1px solid #315657; color: #315657; text-decoration: none; font-size: 9px; font-weight: 800; }
  .related-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 17px; }
  .modal-backdrop { position: fixed; z-index: 100; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(19, 48, 50, .58); backdrop-filter: blur(8px); }
  .copy-modal { position: relative; width: min(460px, 100%); max-height: calc(100vh - 40px); overflow-y: auto; padding: 36px; border-radius: 24px; background: #fffdf8; box-shadow: 0 30px 80px rgba(18, 42, 42, .3); text-align: center; }
  .modal-close { position: absolute; right: 16px; top: 14px; display: grid; width: 34px; height: 34px; place-items: center; border: 0; border-radius: 50%; color: #607675; background: #eef1ec; font-size: 20px; cursor: pointer; }
  .modal-icon { display: grid; width: 58px; height: 58px; place-items: center; margin: 0 auto 17px; border-radius: 50%; color: white; background: #e16a59; box-shadow: 0 0 0 9px #fff0e6; font-size: 22px; }
  .modal-kicker { margin: 0 0 7px; color: #d65f50; font-size: 8px; font-weight: 900; letter-spacing: .17em; }
  .copy-modal h2 { margin: 0; color: #1e4648; font-family: "Yu Mincho", serif; font-size: 25px; line-height: 1.55; }
  .modal-description { margin: 13px auto 20px; color: #768785; font-size: 10px; line-height: 1.8; }
  .copy-preview { display: flex; align-items: center; gap: 13px; padding: 13px; border: 1px solid #e1e4de; border-radius: 13px; background: white; text-align: left; }
  .preview-stamp { display: grid; flex: none; width: 50px; height: 50px; place-items: center; border-radius: 12px 12px 12px 3px; color: white; background: linear-gradient(145deg, #ee947d, #cf6859); font-family: serif; font-size: 21px; }
  .copy-preview div { min-width: 0; }
  .copy-preview small { color: #d06a5b; font-size: 7px; font-weight: 900; letter-spacing: .12em; }
  .copy-preview strong { display: block; overflow: hidden; margin-top: 4px; color: #315455; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
  .copy-preview p { margin: 3px 0 0; color: #929e9b; font-size: 8px; }
  .privacy-note { display: flex; gap: 10px; margin: 13px 0 20px; padding: 12px; border-radius: 11px; color: #466666; background: #eef4ef; text-align: left; }
  .privacy-note > span { flex: none; }
  .privacy-note strong { font-size: 9px; }
  .privacy-note p { margin: 3px 0 0; color: #768b87; font-size: 8px; line-height: 1.6; }
  .modal-primary, .modal-secondary { width: 100%; border: 0; border-radius: 11px; font-weight: 900; cursor: pointer; }
  .modal-primary { display: flex; justify-content: space-between; padding: 14px 17px; color: white; background: #173f42; font-size: 10px; }
  .modal-secondary { margin-top: 7px; padding: 10px; color: #7f8e8b; background: transparent; font-size: 9px; }
  @media (max-width: 900px) { .hero-inner { grid-template-columns: 1fr; max-width: 680px; } .hero-art { width: min(360px, calc(100% - 30px)); margin: 0 auto; } .content-grid { grid-template-columns: 1fr; } .side-column { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; } .side-column section { margin: 0; } .related-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 650px) { .breadcrumb { width: calc(100% - 28px); } .detail-hero { padding: 52px 15px 58px; } .hero-meta { align-items: flex-start; flex-direction: column; } .hero-meta > i { display: none; } .hero-art { box-sizing: border-box; } .action-bar > div { width: calc(100% - 20px); min-height: 62px; } .day-pills { display: none; } .action-buttons { width: 100%; justify-content: flex-end; } .copy-button { flex: 1; } .share-menu { right: auto; left: 0; } .section-wrap { width: calc(100% - 28px); } .content-grid { gap: 40px; padding-top: 65px; padding-bottom: 75px; } .day-section { padding-top: 49px; } .timeline::before { left: 67px; } .timeline-item { grid-template-columns: 49px 15px minmax(0, 1fr); gap: 8px; } .timeline-item time { font-size: 11px; } .step-card { padding: 15px; } .side-column { grid-template-columns: 1fr; } .related-section { padding-top: 70px; padding-bottom: 75px; } .related-grid { grid-template-columns: 1fr; } .copy-modal { padding: 32px 20px 24px; } }
</style>
