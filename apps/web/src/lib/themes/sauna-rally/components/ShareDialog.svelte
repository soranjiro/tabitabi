<script lang="ts">
  interface Props {
    show: boolean;
    hasEditPermission: boolean;
    onCopyLink: (includeToken: boolean) => void;
    onClose: () => void;
  }

  let { show, hasEditPermission, onCopyLink, onClose }: Props = $props();
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="sauna-share-overlay" onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="sauna-share-dialog" onclick={(e) => e.stopPropagation()}>
      <h3 class="sauna-share-dialog-title">🔗 共有</h3>
      
      <div class="sauna-share-options">
        <button
          type="button"
          class="sauna-share-option"
          onclick={() => onCopyLink(false)}
        >
          <div class="sauna-share-option-icon">👁️</div>
          <div class="sauna-share-option-content">
            <div class="sauna-share-option-title">閲覧用リンク</div>
            <div class="sauna-share-option-desc">閲覧のみ可能なリンクをコピー</div>
          </div>
        </button>

        {#if hasEditPermission}
          <button
            type="button"
            class="sauna-share-option"
            onclick={() => onCopyLink(true)}
          >
            <div class="sauna-share-option-icon">✏️</div>
            <div class="sauna-share-option-content">
              <div class="sauna-share-option-title">編集用リンク</div>
              <div class="sauna-share-option-desc">編集権限付きのリンクをコピー</div>
            </div>
          </button>
        {/if}
      </div>

      <div class="sauna-dialog-actions">
        <button
          type="button"
          class="sauna-btn sauna-btn-secondary"
          onclick={onClose}
        >
          閉じる
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sauna-share-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .sauna-share-dialog {
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .sauna-share-dialog-title {
    margin: 0 0 20px 0;
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .sauna-share-options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .sauna-share-option {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: #f5f5f5;
    border: 2px solid transparent;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    font-family: inherit;
  }

  .sauna-share-option:hover {
    background: #efefef;
    border-color: #ff6b35;
  }

  .sauna-share-option-icon {
    font-size: 20px;
    flex-shrink: 0;
  }

  .sauna-share-option-content {
    flex: 1;
  }

  .sauna-share-option-title {
    margin: 0;
    font-weight: 600;
    color: #1a1a1a;
    font-size: 14px;
  }

  .sauna-share-option-desc {
    margin: 4px 0 0 0;
    color: #666;
    font-size: 12px;
  }

  .sauna-dialog-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .sauna-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .sauna-btn-secondary {
    background: #f0f0f0;
    color: #1a1a1a;
  }

  .sauna-btn-secondary:hover {
    background: #e0e0e0;
  }
</style>
