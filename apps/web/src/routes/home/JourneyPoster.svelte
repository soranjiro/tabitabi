<!-- Raster-first presentation. Replace the single poster asset with a true
     vector illustration later, without changing the responsive layout. -->
<section class="feature-poster" aria-labelledby="feature-poster-heading">
  <h2 id="feature-poster-heading" class="sr-only">たびたびでできること</h2>

  <!-- Full composition is preserved on spacious screens. -->
  <img
    class="desktop-composition"
    src="/illustrations/tabitabi-feature-poster.webp"
    alt="たびたびの機能紹介。しおりを作る、多彩なデザイン、SNSで共有、お金・持ち物の管理、シークレットモード、スマホやPCでの閲覧を線画で紹介。"
    width="1208"
    height="1302"
    loading="lazy"
    decoding="async"
  />

  <!-- The three middle scenes alone appear on narrow screens, in their
       original left-to-right order. A single poster asset avoids duplicates. -->
  <ol class="mobile-middle-scenes">
    <li>
      <div class="scene-crop design" role="img" aria-label="多彩なデザイン。旅のスタイルに合わせてテーマを選べます。"></div>
    </li>
    <li>
      <div class="scene-crop sharing" role="img" aria-label="SNSで共有。作ったしおりをみんなに共有できます。"></div>
    </li>
    <li>
      <div class="scene-crop management" role="img" aria-label="お金・持ち物の管理。予算や支出、持ち物をまとめて管理できます。"></div>
    </li>
  </ol>
</section>

<style>
  .feature-poster {
    width: 100%;
    padding: clamp(20px, 3vw, 44px) 16px;
    background: #fefcfa;
    color: #282826;
  }
  .desktop-composition {
    display: block;
    width: min(100%, 1208px);
    height: auto;
    margin-inline: auto;
  }
  .mobile-middle-scenes { display: none; }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 900px) {
    .feature-poster {
      padding: 20px 12px 42px;
    }
    .desktop-composition { display: none; }
    .mobile-middle-scenes {
      display: flex;
      width: min(100%, 440px);
      margin: 0 auto;
      padding: 0;
      list-style: none;
      flex-direction: column;
      gap: clamp(6px, 2vw, 18px);
    }
    .mobile-middle-scenes li { width: 100%; min-width: 0; }
    .scene-crop {
      width: 100%;
      aspect-ratio: 1 / 1.055;
      background-image: url("/illustrations/tabitabi-feature-poster.webp");
      background-repeat: no-repeat;
      background-size: 300% auto;
      background-position-y: 51%;
    }
    .design { background-position-x: 0%; }
    .sharing { background-position-x: 50%; }
    .management { background-position-x: 100%; }
  }
</style>
