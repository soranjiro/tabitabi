<script lang="ts">
  import Dialog from "./Dialog.svelte";
  import { ViewIcon, EditIcon } from "./icons/index.svelte";

  interface Props {
    show: boolean;
    hasEditPermission: boolean;
    onCopyLink: (includeToken: boolean) => void;
    onClose: () => void;
  }

  let { show, hasEditPermission, onCopyLink, onClose }: Props = $props();
</script>

<Dialog {show} title="リンクを共有" {onClose}>
  {#snippet children()}
    <p class="standard-dialog-description">
      どのリンクをコピーしますか?
    </p>
    <div class="standard-share-options">
      <button
        onclick={() => onCopyLink(false)}
        class="standard-share-option"
      >
        <div class="standard-share-option-icon">
          {@html ViewIcon}
        </div>
        <div class="standard-share-option-content">
          <div class="standard-share-option-title">閲覧用リンク</div>
          <div class="standard-share-option-desc">
            閲覧のみ可能なリンクをコピー
          </div>
        </div>
      </button>
      {#if hasEditPermission}
        <button
          onclick={() => onCopyLink(true)}
          class="standard-share-option"
        >
          <div class="standard-share-option-icon">
            {@html EditIcon}
          </div>
          <div class="standard-share-option-content">
            <div class="standard-share-option-title">編集用リンク</div>
            <div class="standard-share-option-desc">
              誰でも編集できるリンクをコピー
            </div>
          </div>
        </button>
      {/if}
    </div>
    <button
      onclick={onClose}
      class="standard-btn standard-btn-secondary standard-btn-full"
    >
      キャンセル
    </button>
  {/snippet}
</Dialog>
