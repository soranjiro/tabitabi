<script lang="ts">
  import Dialog from "./Dialog.svelte";
  import { renderMarkdown } from "../utils/markdown";
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
  let activeTab = $state<"edit" | "preview">("edit");

  $effect(() => {
    if (show) {
      editedMemoText = getMemoText(memo);
      activeTab = hasEditPermission ? "edit" : "preview";
    }
  });

  function handleSave() {
    const updatedMemo = updateMemoText(memo, editedMemoText);
    onSave(updatedMemo);
  }
</script>

<Dialog
  {show}
  title="📝 メモ"
  {onClose}
  variant={hasEditPermission ? "editor" : "default"}
>
  <div class="ai-memo-dialog-content">
    {#if hasEditPermission}
      <div class="ai-memo-tabs">
        <button
          type="button"
          class="ai-memo-tab"
          class:active={activeTab === "edit"}
          onclick={() => (activeTab = "edit")}
        >
          編集
        </button>
        <button
          type="button"
          class="ai-memo-tab"
          class:active={activeTab === "preview"}
          onclick={() => (activeTab = "preview")}
        >
          プレビュー
        </button>
      </div>

      {#if activeTab === "edit"}
        <textarea
          bind:value={editedMemoText}
          placeholder="Markdown形式で記入できます&#10;&#10;## 持ち物リスト&#10;- [ ] パスポート&#10;- [ ] 財布&#10;&#10;## 予約情報&#10;ホテル: ○○ホテル"
          class="ai-memo-textarea"
        ></textarea>
      {:else}
        <div class="ai-memo-preview ai-memo-content">
          {#if editedMemoText}
            {@html renderMarkdown(editedMemoText)}
          {:else}
            <p class="ai-memo-empty">プレビューする内容がありません</p>
          {/if}
        </div>
      {/if}

      <div class="ai-dialog-actions">
        <button
          type="button"
          class="ai-btn ai-btn-primary"
          onclick={handleSave}
        >
          保存
        </button>
        <button type="button" class="ai-btn ai-btn-secondary" onclick={onClose}>
          キャンセル
        </button>
      </div>
    {:else}
      <div class="ai-memo-content ai-memo-readonly">
        {#if memo}
          {@html renderMarkdown(memo)}
        {:else}
          <p class="ai-memo-empty">メモはありません</p>
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
    {/if}
  </div>
</Dialog>
