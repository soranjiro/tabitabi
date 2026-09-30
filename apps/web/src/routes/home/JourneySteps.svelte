<section class="journey-section" aria-labelledby="journey-title">
  <div class="journey-inner">
    <header class="journey-heading">
      <span class="route-mark" aria-hidden="true">
        <span></span><span></span><span></span>
      </span>
      <h2 id="journey-title">つくって、送って、みんなで見る。</h2>
    </header>

    <div class="journey-steps">
      <article class="journey-step">
        <span class="step-number">01</span>
        <div class="step-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M8 6h16v20H8z" />
            <path d="M12 11h8M12 16h8M12 21h5" />
          </svg>
        </div>
        <h3>つくる</h3>
        <p>予定・地図・メモ・写真を、ひとつのしおりにまとめる。</p>
      </article>

      <article class="journey-step">
        <span class="step-number">02</span>
        <div class="step-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M12.5 19.5l7-7" />
            <path d="M10 22l-2 2a4 4 0 0 1-5.7-5.7l4.3-4.3a4 4 0 0 1 5.7 0" />
            <path d="M22 10l2-2a4 4 0 0 1 5.7 5.7L25.4 18a4 4 0 0 1-5.7 0" />
          </svg>
        </div>
        <h3>送る</h3>
        <p>URLを送るだけ。旅のメンバーに同じ予定を共有する。</p>
      </article>

      <article class="journey-step">
        <span class="step-number">03</span>
        <div class="step-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M5 16s4-7 11-7 11 7 11 7-4 7-11 7S5 16 5 16Z" />
            <circle cx="16" cy="16" r="3" />
          </svg>
        </div>
        <h3>見る</h3>
        <p>旅先でも同じしおりを開いて、次の予定をすぐ確認する。</p>
      </article>
    </div>

    <a class="explore-link" href="/explore">
      みんなのしおりを見る <span aria-hidden="true">→</span>
    </a>
  </div>
</section>

<style>
  .journey-section {
    padding: 96px 20px 88px;
    background: var(--home-paper);
  }

  .journey-inner {
    width: min(var(--home-content-main), 100%);
    margin: 0 auto;
  }

  .journey-heading {
    margin-bottom: 42px;
    text-align: center;
  }

  .route-mark {
    position: relative;
    display: flex;
    width: 118px;
    height: 20px;
    margin: 0 auto 12px;
    align-items: center;
    justify-content: space-between;
  }

  .route-mark::before {
    position: absolute;
    right: 10px;
    left: 10px;
    top: 9px;
    border-top: 2px dashed #b6c0c9;
    content: "";
  }

  .route-mark span {
    position: relative;
    z-index: 1;
    width: 10px;
    height: 10px;
    border: 2px solid #8c9dab;
    border-radius: 50%;
    background: var(--home-paper);
  }

  .route-mark span:nth-child(2) {
    width: 12px;
    height: 12px;
    border-color: var(--home-action);
  }

  h2 {
    margin: 0;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: clamp(28px, 4vw, 38px);
    font-weight: 400;
    line-height: 1.4;
    letter-spacing: .035em;
  }

  .journey-steps {
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 18px;
  }

  .journey-steps::before {
    position: absolute;
    top: 52px;
    right: 16.5%;
    left: 16.5%;
    border-top: 1px dashed #c9d1d8;
    content: "";
  }

  .journey-step {
    position: relative;
    z-index: 1;
    min-width: 0;
    padding: 25px 24px 26px;
    border: 1px solid var(--home-border);
    border-radius: var(--home-radius-lg);
    background: rgba(255,255,255,.78);
  }

  .step-number {
    display: block;
    margin-bottom: 9px;
    color: #7c8c9b;
    font-size: 12px;
    font-weight: 900;
    letter-spacing: .12em;
  }

  .step-icon {
    display: grid;
    width: 46px;
    height: 46px;
    margin-bottom: 20px;
    border: 1px solid #cad4dc;
    border-radius: 50%;
    place-items: center;
    color: var(--home-action);
    background: var(--home-paper);
  }

  .step-icon svg {
    width: 24px;
    height: 24px;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  h3 {
    margin: 0 0 8px;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: 20px;
    font-weight: 600;
  }

  p {
    margin: 0;
    color: var(--home-muted);
    font-size: 13px;
    line-height: 1.75;
  }

  .explore-link {
    display: flex;
    width: fit-content;
    min-height: 44px;
    margin: 30px auto 0;
    padding: 8px 10px;
    align-items: center;
    gap: 14px;
    color: var(--home-action);
    font-size: 13px;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 5px;
  }

  .explore-link:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-focus) 45%, white);
    outline-offset: 2px;
  }

  @media (max-width: 767px) {
    .journey-section {
      padding: 68px 16px 64px;
    }

    .journey-heading { margin-bottom: 28px; }

    .journey-steps {
      grid-template-columns: 1fr;
      gap: 10px;
    }

    .journey-steps::before { display: none; }

    .journey-step {
      display: grid;
      padding: 20px;
      grid-template-columns: 48px minmax(0, 1fr);
      column-gap: 14px;
    }

    .step-number {
      grid-column: 2;
      margin: 0 0 4px;
    }

    .step-icon {
      grid-row: 1 / span 3;
      width: 44px;
      height: 44px;
      margin: 0;
    }

    h3 {
      grid-column: 2;
      margin-bottom: 5px;
      font-size: 18px;
    }

    p {
      grid-column: 2;
      font-size: 13px;
    }

    .explore-link { margin-top: 22px; }
  }
</style>
