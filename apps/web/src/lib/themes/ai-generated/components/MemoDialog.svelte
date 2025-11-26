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

<style>
  .ai-memo-dialog-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .ai-memo-tabs {
    display: flex;
    gap: 0.25rem;
    background: var(--ai-surface-hover);
    padding: 0.25rem;
    border-radius: var(--ai-radius-md);
  }

  .ai-memo-tab {
    flex: 1;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    background: transparent;
    border: none;
    border-radius: var(--ai-radius-sm);
    color: var(--ai-text-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ai-memo-tab.active {
    background: var(--ai-surface);
    color: var(--ai-accent);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .ai-memo-textarea {
    min-height: 200px;
    width: 100%;
    padding: 1rem;
    font-size: 0.875rem;
    font-family: inherit;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-md);
    color: var(--ai-text-primary);
    resize: vertical;
  }

  .ai-memo-textarea:focus {
    outline: none;
    border-color: var(--ai-accent);
  }

  .ai-memo-preview {
    min-height: 200px;
    padding: 1rem;
    background: var(--ai-surface-hover);
    border-radius: var(--ai-radius-md);
    overflow-y: auto;
  }

  .ai-memo-content {
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--ai-text-primary);
  }

  .ai-memo-content :global(h1),
  .ai-memo-content :global(h2),
  .ai-memo-content :global(h3) {
    margin: 1rem 0 0.5rem;
    color: var(--ai-text-primary);
  }

  .ai-memo-content :global(h1:first-child),
  .ai-memo-content :global(h2:first-child),
  .ai-memo-content :global(h3:first-child) {
    margin-top: 0;
  }

  .ai-memo-content :global(ul),
  .ai-memo-content :global(ol) {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .ai-memo-content :global(a) {
    color: var(--ai-accent);
    text-decoration: none;
  }

  .ai-memo-content :global(a:hover) {
    text-decoration: underline;
  }

  .ai-dialog-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 0.5rem;
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

  .ai-btn-primary {
    flex: 1;
    background: var(--ai-accent);
    color: white;
  }

  .ai-btn-primary:hover {
    background: var(--ai-accent-dark);
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
