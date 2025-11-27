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

  <div class="ai-dialog-actions ai-dialog-actions-spaced">
    <button
      type="button"
      class="ai-btn ai-btn-secondary ai-btn-full"
      onclick={onClose}
    >
      閉じる
    </button>
  </div>
</Dialog>
