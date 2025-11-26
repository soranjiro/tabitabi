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
