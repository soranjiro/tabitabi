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

  .ai-walica-container {
    width: 100%;
    max-width: 480px;
    height: 85vh;
    background: var(--ai-surface);
    border-radius: var(--ai-radius-lg);
    display: flex;
    flex-direction: column;
    overflow: hidden;
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

  .ai-walica-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--ai-border);
  }

  .ai-walica-title {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
    color: var(--ai-text-primary);
  }

  .ai-btn-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ai-surface-hover);
    border: none;
    border-radius: var(--ai-radius-sm);
    color: var(--ai-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ai-btn-icon:hover {
    background: var(--ai-border);
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

  .ai-btn {
    padding: 0.75rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    text-decoration: none;
    border: none;
    border-radius: var(--ai-radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ai-btn-secondary {
    background: var(--ai-surface-hover);
    color: var(--ai-text-secondary);
  }

  .ai-btn-secondary:hover {
    background: var(--ai-border);
    color: var(--ai-text-primary);
  }
</style>
