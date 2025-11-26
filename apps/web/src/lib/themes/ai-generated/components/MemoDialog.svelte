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
  let activeTab = $state<"edit" | "preview">("edit");

  $effect(() => {
    if (show) {
      editedMemo = memo;
      activeTab = hasEditPermission ? "edit" : "preview";
    }
  });

  function handleSave() {
    onSave(editedMemo);
  }
</script>

<Dialog {show} title="📝 メモ" {onClose}>
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
          bind:value={editedMemo}
          placeholder="Markdown形式で記入できます&#10;&#10;## 持ち物リスト&#10;- [ ] パスポート&#10;- [ ] 財布&#10;&#10;## 予約情報&#10;ホテル: ○○ホテル"
          class="ai-memo-textarea"
        ></textarea>
      {:else}
        <div class="ai-memo-preview ai-memo-content">
          {#if editedMemo}
            {@html renderMarkdown(editedMemo)}
          {:else}
            <p style="color: var(--ai-text-muted)">
              プレビューする内容がありません
            </p>
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
      <div
        class="ai-memo-content"
        style="padding: 1rem; background: var(--ai-surface-hover); border-radius: var(--ai-radius-md);"
      >
        {#if memo}
          {@html renderMarkdown(memo)}
        {:else}
          <p style="color: var(--ai-text-muted); text-align: center;">
            メモはありません
          </p>
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
    {/if}
  </div>
</Dialog>
