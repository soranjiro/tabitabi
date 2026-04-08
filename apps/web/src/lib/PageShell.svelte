<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    title,
    subtitle,
    backHref = "/",
    backLabel = "← たびたび",
    children,
  }: {
    title: string;
    subtitle?: string;
    backHref?: string;
    backLabel?: string;
    children: Snippet;
  } = $props();
</script>

<div class="page-wrapper">
  <header class="page-header">
    <div class="header-inner">
      <a href={backHref} class="back-link">{backLabel}</a>
      <h1 class="page-title">{title}</h1>
      {#if subtitle}
        <p class="page-subtitle">{subtitle}</p>
      {/if}
    </div>
  </header>

  <div class="page-content">
    <div class="content-inner">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .page-wrapper {
    min-height: 100vh;
    background: linear-gradient(145deg, #84c6ff 0%, #a6b3ff 40%, #b5daf8 100%);
  }

  .page-header {
    padding: 1.5rem 1rem 3rem;
  }

  .header-inner {
    max-width: 768px;
    margin: 0 auto;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    margin-bottom: 1rem;
    transition: color 0.15s;
  }

  .back-link:hover {
    color: white;
  }

  .page-title {
    font-size: 2rem;
    font-weight: 900;
    color: white;
    margin: 0;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .page-subtitle {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.85);
    margin: 0.25rem 0 0;
  }

  .page-content {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.93) 0%, #f7fbff 100%);
    border-radius: 1.5rem 1.5rem 0 0;
    min-height: calc(100vh - 11rem);
    padding: 2rem 1rem 3rem;
  }

  .content-inner {
    max-width: 768px;
    margin: 0 auto;
  }
</style>
