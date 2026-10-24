<script lang="ts">
  const features = [
    { id: "create", title: "しおりを作る", lines: ["行きたい場所や予定をまとめて", "自分だけの旅のしおりを作成。"] },
    { id: "design", title: "多彩なデザイン", lines: ["旅のスタイルに合わせて。", "選べるテーマで、見やすくおしゃれに。"] },
    { id: "share", title: "SNSで共有", lines: ["作ったしおりをみんなに送って", "旅の楽しみを分かち合おう。"] },
    { id: "prepare", title: "お金・持ち物の管理", lines: ["予算や支出、持ち物リストも。", "旅の準備を、ひとつのしおりで。"] },
    { id: "secret", title: "シークレットモード", lines: ["予定は、その時までのお楽しみ。", "サプライズのある旅にも。"] },
    { id: "devices", title: "いつでも、どこでも", lines: ["スマホでも、PCでも。", "旅の計画・編集・閲覧をスムーズに。"] },
  ];
</script>

<section class="feature-poster" aria-labelledby="feature-poster-heading">
  <div class="poster-inner">
    <svg class="journey-thread" viewBox="0 0 1120 1140" fill="none" preserveAspectRatio="none" aria-hidden="true">
      <path d="M100 92C58 107 39 143 47 185C63 263 214 260 315 252S493 225 543 195C610 170 670 180 731 162 M958 176C1045 170 1140 190 1140 270C1140 365 1050 352 1032 446 M270 518C335 480 359 575 438 562 M619 571C680 625 757 604 818 529 M43 565C-20 560-25 610-22 665C-18 776 230 755 344 785C450 810 424 905 460 942C530 1030 655 900 728 895 M951 995C1020 1020 1106 1009 1110 960C1115 920 1077 918 1082 947C1085 965 1099 970 1107 965" />
    </svg>
    <header class="poster-intro">
      <svg class="intro-flight" viewBox="0 0 420 100" fill="none" aria-hidden="true">
        <path d="M20 75C-4 35 56 17 56 36C56 53 20 66 51 77C93 92 179 28 229 46C264 59 232 82 229 68C226 52 263 44 295 20" />
        <path class="paper-plane" d="M274 23L324 6L306 51L294 34L281 45L285 29L324 6L294 34" />
      </svg>
      <p class="poster-wordmark" aria-hidden="true">たびたび</p>
      <h2 id="feature-poster-heading">旅のしおりを、もっと自由に。</h2>
    </header>
    {#each features as feature}
      <article class="feature" class:feature-create={feature.id === "create"} class:feature-wide={feature.id === "secret" || feature.id === "devices"}>
        <img src={`/illustrations/features/${feature.id}.svg`} alt="" width="360" height="240" loading="lazy" decoding="async" />
        <div class="feature-caption">
          <h3>{feature.title}</h3>
          <p>{feature.lines[0]}<br />{feature.lines[1]}</p>
        </div>
      </article>
    {/each}
  </div>
</section>

<style>
  .feature-poster {
    --poster-paper: #fbf9f5;
    width: 100%;
    padding: 64px 32px 76px;
    background: var(--poster-paper);
    color: #30302d;
  }
  .poster-inner {
    position: relative;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    column-gap: 24px;
    row-gap: 66px;
    width: min(100%, 1120px);
    margin-inline: auto;
    isolation: isolate;
  }
  .journey-thread {
    position: absolute;
    inset: 0;
    z-index: -1;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }
  .journey-thread path,
  .intro-flight path {
    stroke: #41413b;
    stroke-width: 1.65;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .poster-intro {
    grid-column: span 3;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding-bottom: 30px;
    text-align: center;
  }
  .intro-flight { width: min(100%, 360px); height: 86px; margin-bottom: 8px; }
  .paper-plane { fill: var(--poster-paper); }
  .poster-wordmark {
    margin: 0 0 12px;
    padding-left: .34em;
    font-size: 30px;
    font-weight: 400;
    line-height: 1.4;
    letter-spacing: .34em;
  }
  h2 { margin: 0; font-size: 16px; font-weight: 400; line-height: 1.8; letter-spacing: .09em; }
  .feature { grid-column: span 2; min-width: 0; text-align: center; }
  .feature-create,
  .feature-wide { grid-column: span 3; }
  .feature img { display: block; width: min(100%, 320px); height: auto; margin: 0 auto 18px; }
  .feature-caption { position: relative; padding: 4px 8px; }
  .feature h3 {
    position: relative;
    width: fit-content;
    margin: 0 auto 12px;
    background: var(--poster-paper);
    font-size: clamp(18px, 1.8vw, 22px);
    font-weight: 500;
    line-height: 1.6;
    letter-spacing: .07em;
  }
  .feature p {
    position: relative;
    width: fit-content;
    margin: 0 auto;
    background: var(--poster-paper);
    color: #5c5b54;
    font-size: 13px;
    line-height: 1.9;
    letter-spacing: .035em;
  }
  @media (max-width: 900px) {
    .feature-poster { padding: 44px 28px 56px; }
    .poster-inner { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 44px 24px; }
    .poster-intro { grid-column: 1 / -1; padding-bottom: 0; }
    .feature,
    .feature-create,
    .feature-wide { grid-column: span 1; }
    .journey-thread { display: none; }
    .feature img { margin-bottom: 12px; }
    .feature h3 { font-size: 18px; letter-spacing: .04em; }
  }
  @media (max-width: 640px) {
    .feature-poster { padding: 32px 24px 48px; }
    .poster-inner { grid-template-columns: minmax(0, 1fr); gap: 42px; }
    .poster-intro { padding-bottom: 4px; }
    .intro-flight { width: 280px; max-width: 100%; height: 68px; }
    .poster-wordmark { font-size: 26px; }
    h2 { font-size: 14px; letter-spacing: .06em; }
    .feature img { width: min(100%, 288px); margin-bottom: 8px; }
    .feature h3 { margin-bottom: 8px; font-size: 20px; }
    .feature p { font-size: 14px; line-height: 1.85; letter-spacing: 0; }
  }
</style>
