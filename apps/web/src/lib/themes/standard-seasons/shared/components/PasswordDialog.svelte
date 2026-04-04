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

  function handleSubmit() {
    onAuth(password);
    password = "";
  }

  function handleClose() {
    password = "";
    onClose();
  }
</script>

<Dialog {show} title="編集パスワード" onClose={handleClose}>
  {#snippet children()}
    <form
      onsubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <input
        type="password"
        bind:value={password}
        placeholder="パスワードを入力"
        class="standard-input"
        disabled={isAuthenticating}
      />
      <div class="standard-dialog-actions">
        <button
          type="submit"
          class="standard-btn standard-btn-primary"
          disabled={isAuthenticating}
        >
          {isAuthenticating ? "認証中..." : "認証"}
        </button>
        <button
          type="button"
          onclick={handleClose}
          class="standard-btn standard-btn-secondary"
          disabled={isAuthenticating}
        >
          キャンセル
        </button>
      </div>
    </form>
  {/snippet}
</Dialog>
