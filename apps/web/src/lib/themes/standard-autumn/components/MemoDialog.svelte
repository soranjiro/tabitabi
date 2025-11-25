<script lang="ts">
  import Dialog from "./Dialog.svelte";
  import { renderMarkdown } from "../utils/markdown";

  interface Props {
    show: boolean;
    memo: string;
    hasEditPermission: boolean;
    onSave: (memo: string) => void;
    onClose: () => void;
  }

  let { show, memo, hasEditPermission, onSave, onClose }: Props = $props();

  let editedMemo = $state(memo);

  $effect(() => {
    editedMemo = memo;
  });

  function handleSave() {
    onSave(editedMemo.trim());
  }
</script>

<Dialog {show} title="メモ" {onClose}>
  {#snippet children()}
    <textarea
      bind:value={editedMemo}
      placeholder="メモを入力..."
      class="standard-autumn-textarea"
      rows="6"
      disabled={!hasEditPermission}
    ></textarea>
  {/snippet}

  {#snippet actions()}
    {#if hasEditPermission}
      <button
        onclick={handleSave}
        class="standard-autumn-btn standard-autumn-btn-primary"
      >
        保存
      </button>
    {/if}
    <button
      onclick={onClose}
      class="standard-autumn-btn standard-autumn-btn-secondary"
    >
      閉じる
    </button>
  {/snippet}
</Dialog>
