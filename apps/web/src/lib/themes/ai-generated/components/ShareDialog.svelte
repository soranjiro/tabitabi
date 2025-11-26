<script lang="ts">
  import Dialog from "./Dialog.svelte";

  interface Props {
    show: boolean;
    hasEditPermission: boolean;
    onCopyLink: (includeToken: boolean) => void;
    onClose: () => void;
  }

  let { show, hasEditPermission, onCopyLink, onClose }: Props = $props();
</script>

<Dialog {show} title="🔗 共有" {onClose}>
  <div class="ai-share-options">
    <button
      type="button"
      class="ai-share-option"
      onclick={() => onCopyLink(false)}
    >
      <div class="ai-share-option-title">👁️ 閲覧用リンク</div>
      <div class="ai-share-option-desc">閲覧のみ可能なリンクをコピー</div>
    </button>

    {#if hasEditPermission}
      <button
        type="button"
        class="ai-share-option"
        onclick={() => onCopyLink(true)}
      >
        <div class="ai-share-option-title">✏️ 編集用リンク</div>
        <div class="ai-share-option-desc">編集権限付きのリンクをコピー</div>
      </button>
    {/if}
  </div>

  <div class="ai-dialog-actions" style="margin-top: 1.5rem;">
    <button
      type="button"
      class="ai-btn ai-btn-secondary"
      onclick={onClose}
      style="flex: 1;"
    >
      閉じる
    </button>
  </div>
</Dialog>

<style>
  .ai-share-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .ai-share-option {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-md);
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;
  }

  .ai-share-option:hover {
    border-color: var(--ai-accent);
    background: rgba(14, 165, 233, 0.04);
  }

  .ai-share-option-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: var(--ai-text-primary);
  }

  .ai-share-option-desc {
    font-size: 0.8125rem;
    color: var(--ai-text-muted);
  }

  .ai-dialog-actions {
    display: flex;
    gap: 0.75rem;
  }

  .ai-btn {
    padding: 0.75rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 500;
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
