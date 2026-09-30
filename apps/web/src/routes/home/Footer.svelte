<script lang="ts">
  import IconAirplane from "./icons/IconAirplane.svelte";
  import IconGitHub from "./icons/IconGitHub.svelte";

  let FeedbackWidget = $state<any>(null);
  let feedbackKey = $state(0);

  async function openFeedback() {
    if (!FeedbackWidget) {
      FeedbackWidget = (await import("$lib/feedback/FeedbackWidget.svelte")).default;
    }
    feedbackKey += 1;
  }
</script>

<footer class="footer">
  <div class="footer-content">
    <a class="footer-brand" href="/" aria-label="たびたび ホーム">
      <span class="footer-mark"><IconAirplane size={20} /></span>
      <span>たびたび</span>
    </a>

    <nav class="footer-links" aria-label="フッターナビゲーション">
      <a href="/docs/index" class="footer-link">使い方</a>
      <a
        href="https://github.com/soranjiro/tabitabi"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link github-link"
        aria-label="GitHub"
      >
        <IconGitHub size={20} />
      </a>
      <button type="button" class="feedback-trigger" onclick={openFeedback} aria-haspopup="dialog">
        要望
      </button>
      {#if FeedbackWidget}
        {#key feedbackKey}
          <div class="feedback-widget-host">
            <FeedbackWidget variant="footer" initiallyOpen />
          </div>
        {/key}
      {/if}
    </nav>

    <p class="footer-copy">旅をもっと楽しく。</p>
  </div>
</footer>

<style>
  .footer {
    border-top: 1px solid var(--home-border);
    color: var(--home-ink);
    background: var(--home-paper);
    padding: 34px 20px 38px;
  }

  .footer-content {
    display: grid;
    width: min(var(--home-content-main), 100%);
    margin: 0 auto;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 18px 28px;
  }

  .footer-brand {
    display: inline-flex;
    width: fit-content;
    min-height: 44px;
    align-items: center;
    gap: 9px;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: 18px;
    font-weight: 600;
    letter-spacing: .05em;
    text-decoration: none;
  }

  .footer-mark {
    display: grid;
    width: 34px;
    height: 34px;
    border: 1px solid var(--home-border);
    border-radius: 50%;
    place-items: center;
    color: var(--home-action);
    background: white;
  }

  .footer-links {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
  }

  .footer-link,
  .feedback-trigger {
    display: inline-flex;
    min-width: 44px;
    min-height: 44px;
    padding: 8px 10px;
    border: 0;
    border-radius: var(--home-radius-sm);
    align-items: center;
    justify-content: center;
    color: var(--home-ink);
    background: transparent;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
    cursor: pointer;
  }

  .footer-link:hover,
  .feedback-trigger:hover {
    background: var(--home-surface-soft);
  }

  .footer-brand:focus-visible,
  .footer-link:focus-visible,
  .feedback-trigger:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-focus) 45%, white);
    outline-offset: 2px;
  }

  .github-link { padding-inline: 12px; }

  .footer-copy {
    grid-column: 1 / -1;
    margin: 0;
    color: var(--home-muted);
    font-size: 12px;
  }

  .feedback-widget-host {
    display: contents;
  }

  .feedback-widget-host :global(.feedback-trigger.footer-trigger) {
    display: none;
  }

  @media (max-width: 560px) {
    .footer {
      padding: 26px 16px 30px;
    }

    .footer-content {
      grid-template-columns: auto 1fr;
      gap: 12px 16px;
    }

    .footer-brand {
      font-size: 16px;
    }

    .footer-links {
      gap: 2px;
      justify-content: flex-end;
    }

    .footer-link,
    .feedback-trigger {
      padding-inline: 8px;
      font-size: 12px;
    }

    .footer-copy {
      text-align: center;
    }
  }
</style>
