<script lang="ts">
  interface Props {
    show: boolean;
    memoText: string;
    onUpdate: (text: string) => void;
    onClose: () => void;
  }

  let { show, memoText, onUpdate, onClose }: Props = $props();
  let editedText = $state(memoText);

  $effect(() => {
    if (show) {
      editedText = memoText;
    }
  });
</script>

{#if show}
  <div
    class="dialog-overlay"
    onclick={onClose}
    onkeydown={(e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }}
    role="presentation"
  >
    <div
      class="dialog"
      role="dialog"
      aria-modal="true"
      onkeydown={(e) => e.stopPropagation()}
      onclick={(e) => e.stopPropagation()}
    >
      <h2>メモ編集</h2>
      <textarea bind:value={editedText} placeholder="メモを入力"></textarea>
      <div class="dialog-actions">
        <button
          class="btn-primary"
          onclick={() => {
            onUpdate(editedText);
            onClose();
          }}
        >
          保存
        </button>
        <button class="btn-secondary" onclick={onClose}> キャンセル </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
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

  .dialog {
    background: white;
    padding: 24px;
    border-radius: 12px;
    max-width: 400px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }

  .dialog h2 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #1f2937;
  }

  textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
    box-sizing: border-box;
    margin-bottom: 12px;
    min-height: 120px;
    resize: vertical;
  }

  textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  .dialog-actions {
    display: flex;
    gap: 8px;
  }

  .btn-primary,
  .btn-secondary {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-secondary {
    background: #f0f0f0;
    color: #666;
  }

  .btn-secondary:hover {
    background: #e0e0e0;
  }
</style>
