<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    show: boolean;
    title?: string;
    onClose: () => void;
    children?: Snippet;
  }

  let { show, title = "", onClose, children }: Props = $props();
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="ai-overlay" onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="ai-dialog" onclick={(e) => e.stopPropagation()}>
      {#if title}
        <h3 class="ai-dialog-title">{title}</h3>
      {/if}
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>
{/if}

<style>
  .ai-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .ai-dialog {
    background: var(--ai-surface);
    border-radius: var(--ai-radius-lg);
    padding: 1.5rem;
    max-width: 400px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
    animation: scaleIn 0.2s ease;
  }

  @keyframes scaleIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  .ai-dialog-title {
    margin: 0 0 1rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--ai-text-primary);
  }
</style>
