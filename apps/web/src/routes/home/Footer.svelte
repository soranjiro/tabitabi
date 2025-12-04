<script lang="ts">
  import IconBook from "./icons/IconBook.svelte";
  import IconGitHub from "./icons/IconGitHub.svelte";
</script>

<footer class="footer">
  <div class="footer-content">
    <div class="footer-links">
      <a
        href="/docs/index"
        rel="noopener noreferrer"
        class="footer-link"
      >
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
    justify-content: center;
    gap: 2rem;
    margin-bottom: 0.75rem;
  }

  .footer-link {
    color: #d1d5db;
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
    color: #9ca3af;
    font-size: 0.75rem;
  }
</style>
