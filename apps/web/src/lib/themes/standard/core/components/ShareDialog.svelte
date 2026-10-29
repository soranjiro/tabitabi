<script lang="ts">
  import { onMount } from "svelte";
  import Dialog from "./Dialog.svelte";
  import { ViewIcon, EditIcon } from "./icons/index.svelte";

  interface Props {
    show: boolean;
    hasEditPermission: boolean;
    onCopyLink: (includeToken: boolean) => void;
    onClose: () => void;
  }

  let { show, hasEditPermission, onCopyLink, onClose }: Props = $props();
  let useNativeShare = $state(false);

  onMount(() => {
    useNativeShare =
      typeof navigator.share === "function" &&
      (navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches);
  });
</script>

<Dialog {show} title="リンクを共有" {onClose}>
  {#snippet children()}
    <p class="standard-dialog-description">旅の仲間に送るURLをコピーします。</p>
    <div class="standard-share-options">
      <button
        onclick={() => onCopyLink(false)}
        class="standard-share-option"
      >
        <div class="standard-share-option-icon">
          {@html ViewIcon}
        </div>
        <div class="standard-share-option-content">
          <div class="standard-share-option-title">{useNativeShare ? "閲覧用リンクを共有" : "閲覧用URLをコピー"}</div>
          <div class="standard-share-option-desc">{useNativeShare ? "予定を見るだけのリンクを共有します" : "予定を見るだけのURLです"}</div>
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
            <div class="standard-share-option-title">{useNativeShare ? "編集用リンクを共有" : "編集用URLをコピー"}</div>
            <div class="standard-share-option-desc">{useNativeShare ? "編集権限付きのリンクを共有します" : "このURLを知っている人は編集できます"}</div>
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
