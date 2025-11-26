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
    <div class="ai-dialog ai-card" onclick={(e) => e.stopPropagation()}>
      {#if title}
        <h3 class="ai-dialog-title">{title}</h3>
      {/if}
      {#if children}
        {@render children()}
      {/if}
    </div>
  </div>
{/if}
