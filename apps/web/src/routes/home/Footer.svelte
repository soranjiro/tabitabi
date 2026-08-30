<script lang="ts">
  import IconBook from "./icons/IconBook.svelte";
  import IconGitHub from "./icons/IconGitHub.svelte";

  // The dialog is not needed for the initial page render. Loading it only
  // after intent keeps its substantial form styles out of the hero's critical
  // rendering path.
  let FeedbackWidget = $state<any>(null);

  async function openFeedback() {
    FeedbackWidget = (await import("$lib/feedback/FeedbackWidget.svelte")).default;
  }
</script>

<footer class="footer">
  <div class="footer-content">
    <div class="footer-links">
      <a href="/docs/index" rel="noopener noreferrer" class="footer-link">
        <IconBook size={18} />
        ドキュメント
      </a>
      <a
        href="https://github.com/soranjiro/tabitabi"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link"
      >
        <IconGitHub size={18} />
        GitHub
      </a>
      {#if FeedbackWidget}
        <FeedbackWidget variant="footer" initiallyOpen />
      {:else}
        <button type="button" class="feedback-trigger footer-trigger" onclick={openFeedback} aria-haspopup="dialog">
          <span aria-hidden="true">✦</span>
          要望を送る
        </button>
      {/if}
    </div>
    <p class="footer-copy">たびたび - 旅をもっと楽しく</p>
  </div>
</footer>

<style>
  .footer {
    background: #1f2937;
    color: white;
    padding: 1.5rem 1rem;
  }

  .footer-content {
    max-width: 800px;
    margin: 0 auto;
    text-align: center;
  }

  .footer-links {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 0.75rem;
  }

  .footer-link {
    color: #e5e7eb;
    text-decoration: none;
    font-size: 0.875rem;
    transition: color 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    min-height: 44px;
  }

  .footer-link :global(svg) {
    flex-shrink: 0;
  }

  .footer-link:hover {
    color: white;
  }

  .footer-copy {
    color: #d1d5db;
    font-size: 0.75rem;
  }

  .feedback-trigger {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 44px;
    padding: 0.5rem;
    border: 0;
    color: #e5e7eb;
    background: transparent;
    font: inherit;
    font-size: 0.875rem;
    cursor: pointer;
  }

  .feedback-trigger:hover { color: white; }

  @media (max-width: 560px) {
    .footer-links { flex-direction: column; align-items: center; gap: 0.2rem; }
  }
</style>
