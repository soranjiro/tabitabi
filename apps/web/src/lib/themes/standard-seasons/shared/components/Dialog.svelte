<script lang="ts">
  interface Props {
    show: boolean;
    title: string;
    onClose: () => void;
    children?: import("svelte").Snippet;
    actions?: import("svelte").Snippet;
  }

  let { show, title, onClose, children, actions }: Props = $props();
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="standard-autumn-dialog-overlay" onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="standard-autumn-dialog" onclick={(e) => e.stopPropagation()}>
      <div class="standard-autumn-dialog-header">
        <h3 class="standard-autumn-dialog-title">{title}</h3>
      </div>
      <div class="standard-autumn-dialog-content">
        {#if children}
          {@render children()}
        {/if}
      </div>
      {#if actions}
        <div class="standard-autumn-dialog-actions-footer">
          {@render actions()}
        </div>
      {/if}
    </div>
  </div>
{/if}
