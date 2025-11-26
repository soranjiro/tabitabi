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

<style>
  .ai-walica-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .ai-walica-container {
    width: 100%;
    max-width: 480px;
    height: 85vh;
    background: var(--ai-surface);
    border-radius: var(--ai-radius-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: var(--ai-shadow-lg);
  }

  .ai-walica-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--ai-border);
  }

  .ai-walica-title {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0;
    color: var(--ai-text-primary);
  }

  .ai-walica-frame-container {
    flex: 1;
    overflow: hidden;
  }

  .ai-walica-frame {
    width: 100%;
    height: 100%;
    border: none;
  }

  .ai-walica-footer {
    padding: 1rem;
    border-top: 1px solid var(--ai-border);
    display: flex;
    justify-content: center;
  }
</style>
