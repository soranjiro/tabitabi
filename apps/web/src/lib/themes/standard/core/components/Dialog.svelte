<script lang="ts">
  interface Props {
    show: boolean;
    title: string;
    onClose: () => void;
    variant?: "default" | "editor";
    children?: import("svelte").Snippet;
    actions?: import("svelte").Snippet;
  }

  let {
    show,
    title,
    onClose,
    variant = "default",
    children,
    actions,
  }: Props = $props();
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="standard-dialog-overlay" onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="standard-dialog"
      class:standard-dialog-editor={variant === "editor"}
      onclick={(e) => e.stopPropagation()}
    >
      <div class="standard-dialog-header">
        <h3 class="standard-dialog-title">{title}</h3>
        <button type="button" class="standard-dialog-close" onclick={onClose} aria-label="閉じる">×</button>
      </div>
      <div class="standard-dialog-content">
        {#if children}
          {@render children()}
        {/if}
      </div>
      {#if actions}
        <div class="standard-dialog-actions-footer">
          {@render actions()}
        </div>
      {/if}
    </div>
  </div>
{/if}
