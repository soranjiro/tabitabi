<script lang="ts">
  interface Props {
    show: boolean;
    walicaId: string;
    onClose: () => void;
  }

  let { show, walicaId, onClose }: Props = $props();

  const walicaUrl = $derived(`https://walica.jp/group/${walicaId}`);
</script>

{#if show && walicaId}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="ai-walica-overlay" onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="ai-walica-container" onclick={(e) => e.stopPropagation()}>
      <div class="ai-walica-header">
        <h3 class="ai-walica-title">💰 Walica</h3>
        <button
          type="button"
          class="ai-btn-icon"
          onclick={onClose}
          aria-label="閉じる"
        >
          ✕
        </button>
      </div>
      <div class="ai-walica-frame-container">
        <iframe src={walicaUrl} title="Walica" class="ai-walica-frame"></iframe>
      </div>
      <div class="ai-walica-footer">
        <a
          href={walicaUrl}
          target="_blank"
          rel="noopener noreferrer"
          class="ai-btn ai-btn-secondary"
        >
          Walicaで開く ↗
        </a>
      </div>
    </div>
  </div>
{/if}
