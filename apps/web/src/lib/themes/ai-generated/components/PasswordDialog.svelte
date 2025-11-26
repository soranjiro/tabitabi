<script lang="ts">
  import Dialog from "./Dialog.svelte";

  interface Props {
    show: boolean;
    isAuthenticating: boolean;
    onAuth: (password: string) => void;
    onClose: () => void;
  }

  let { show, isAuthenticating, onAuth, onClose }: Props = $props();

  let password = $state("");

  function handleSubmit(e: Event) {
    e.preventDefault();
    onAuth(password);
  }

  $effect(() => {
    if (!show) {
      password = "";
    }
  });
</script>

<Dialog {show} title="🔐 編集パスワード" {onClose}>
  <form onsubmit={handleSubmit}>
    <p
      style="text-align: center; color: var(--ai-text-secondary); margin-bottom: 1.5rem; font-size: 0.875rem;"
    >
      編集するにはパスワードを入力してください
    </p>
    <input
      type="password"
      bind:value={password}
      placeholder="パスワード"
      class="ai-input"
      disabled={isAuthenticating}
      style="margin-bottom: 1.5rem;"
    />
    <div class="ai-dialog-actions">
      <button
        type="submit"
        class="ai-btn ai-btn-primary"
        disabled={isAuthenticating}
      >
        {isAuthenticating ? "認証中..." : "認証"}
      </button>
      <button
        type="button"
        class="ai-btn ai-btn-secondary"
        onclick={onClose}
        disabled={isAuthenticating}
      >
        キャンセル
      </button>
    </div>
  </form>
</Dialog>

<style>
  .ai-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.9375rem;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-md);
    color: var(--ai-text-primary);
    transition: border-color 0.2s ease;
  }

  .ai-input:focus {
    outline: none;
    border-color: var(--ai-accent);
  }

  .ai-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ai-dialog-actions {
    display: flex;
    gap: 0.75rem;
  }

  .ai-btn {
    flex: 1;
    padding: 0.75rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    border: none;
    border-radius: var(--ai-radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ai-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ai-btn-primary {
    background: var(--ai-accent);
    color: white;
  }

  .ai-btn-primary:hover:not(:disabled) {
    background: var(--ai-accent-dark);
  }

  .ai-btn-secondary {
    background: var(--ai-surface-hover);
    color: var(--ai-text-secondary);
  }

  .ai-btn-secondary:hover:not(:disabled) {
    background: var(--ai-border);
    color: var(--ai-text-primary);
  }
</style>
