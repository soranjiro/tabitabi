<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    onAdd?: () => void;
    onShare?: () => void;
    onScrollTop?: () => void;
    children?: Snippet;
  }

  let { onAdd, onShare, onScrollTop }: Props = $props();

  let showScrollTop = $state(false);
  let isExpanded = $state(false);

  $effect(() => {
    function handleScroll() {
      showScrollTop = window.scrollY > 300;
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  });

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
    onScrollTop?.();
  }

  function toggle() {
    isExpanded = !isExpanded;
  }
</script>

<div class="floating-container" class:expanded={isExpanded}>
  {#if showScrollTop}
    <button
      class="fab fab-secondary scroll-top"
      onclick={scrollToTop}
      aria-label="トップへ戻る"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  {/if}

  {#if isExpanded}
    <div class="fab-menu">
      {#if onShare}
        <button
          class="fab fab-option"
          onclick={() => {
            onShare();
            toggle();
          }}
          aria-label="共有"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      {/if}
      {#if onAdd}
        <button
          class="fab fab-option"
          onclick={() => {
            onAdd();
            toggle();
          }}
          aria-label="予定を追加"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <line x1="12" y1="14" x2="12" y2="18" />
            <line x1="10" y1="16" x2="14" y2="16" />
          </svg>
        </button>
      {/if}
    </div>
  {/if}

  <button
    class="fab fab-main"
    class:active={isExpanded}
    onclick={toggle}
    aria-label="メニュー"
  >
    <span class="fab-icon">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </span>
  </button>
</div>

<style>
  .floating-container {
    position: fixed;
    bottom: 5rem;
    right: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    z-index: 1000;
  }

  .fab {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: var(--ai-shadow-lg);
  }

  .fab-main {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      var(--ai-primary) 0%,
      var(--ai-secondary) 100%
    );
    color: white;
  }

  .fab-main:hover {
    transform: scale(1.1);
    box-shadow:
      var(--ai-shadow-xl),
      0 0 20px rgba(99, 102, 241, 0.4);
  }

  .fab-main:active {
    transform: scale(0.95);
  }

  .fab-main.active .fab-icon {
    transform: rotate(45deg);
  }

  .fab-icon {
    display: flex;
    transition: transform 0.3s ease;
  }

  .fab-menu {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.8);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .fab-option {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: var(--ai-surface);
    color: var(--ai-primary);
    border: 2px solid var(--ai-primary);
  }

  .fab-option:hover {
    background: var(--ai-primary);
    color: white;
    transform: scale(1.1);
  }

  .fab-secondary {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--ai-surface);
    color: var(--ai-text-primary);
    border: 1px solid var(--ai-border);
  }

  .fab-secondary:hover {
    background: var(--ai-primary);
    color: white;
    border-color: var(--ai-primary);
  }

  .scroll-top {
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
