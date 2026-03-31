<script lang="ts">
  import Dialog from "./Dialog.svelte";
  import { getMemoText, updateMemoText } from "$lib/memo";

  interface Props {
    show: boolean;
    memo: string;
    hasEditPermission: boolean;
    onSave: (memo: string) => void;
    onClose: () => void;
  }

  let { show, memo, hasEditPermission, onSave, onClose }: Props = $props();

  let editedMemoText = $state(getMemoText(memo));

  $effect(() => {
    editedMemoText = getMemoText(memo);
  });

  function handleSave() {
    const updatedMemo = updateMemoText(memo, editedMemoText.trim());
    onSave(updatedMemo);
  }
</script>

<Dialog {show} title="メモ" {onClose}>
  {#snippet children()}
    <textarea
      bind:value={editedMemoText}
      placeholder="メモを入力..."
      class="ss-textarea"
      style="width: min(90vw, 600px)"
      rows={6}
      disabled={!hasEditPermission}
    ></textarea>
  {/snippet}
  {#snippet actions()}
    {#if hasEditPermission}
      <button onclick={handleSave} class="ss-btn ss-btn-primary">保存</button>
    {/if}
    <button onclick={onClose} class="ss-btn ss-btn-secondary">閉じる</button>
  {/snippet}
</Dialog>
