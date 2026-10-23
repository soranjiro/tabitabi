<!-- Both layouts use hand-authored, smooth SVG strokes rather than traced pixels.
     The mobile artwork retains only the middle three scenes. -->
<section class="feature-poster" aria-labelledby="feature-poster-heading">
  <h2 id="feature-poster-heading" class="sr-only">たびたびでできること</h2>
  <picture class="poster-picture">
    <source
      media="(max-width: 900px)"
      srcset="/illustrations/tabitabi-feature-poster-mobile.svg"
      type="image/svg+xml"
      width="500"
      height="1660"
    />
    <img
      class="poster-image"
      src="/illustrations/tabitabi-feature-poster.svg"
      alt="たびたびの機能を紹介する線画。多彩なデザイン、SNSで共有、お金・持ち物の管理など。"
      width="1208"
      height="1302"
      loading="lazy"
      decoding="async"
    />
  </picture>
</section>

<style>
  .feature-poster {
    width: 100%;
    padding: clamp(20px, 3vw, 44px) 16px;
    background: #fefcf9;
    color: #282826;
  }

  .poster-picture,
  .poster-image {
    display: block;
    height: auto;
    max-width: 100%;
  }

  .poster-picture {
    width: min(100%, 1208px);
    margin-inline: auto;
  }

  .poster-image {
    width: 100%;
  }

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

    .poster-picture {
      width: min(100%, 500px);
    }
  }
</style>
