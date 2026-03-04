<script lang="ts">
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

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="sauna-password-overlay" onclick={handleClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="sauna-password-dialog" onclick={(e) => e.stopPropagation()}>
      <h3 class="sauna-password-dialog-title">🔐 パスワード入力</h3>
      <p class="sauna-password-dialog-desc">このしおりを編集するにはパスワードが必要です</p>

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
          class="sauna-password-input"
          disabled={isAuthenticating}
        />

        <div class="sauna-dialog-actions">
          <button
            type="button"
            class="sauna-btn sauna-btn-secondary"
            onclick={handleClose}
            disabled={isAuthenticating}
          >
            キャンセル
          </button>
          <button
            type="submit"
            class="sauna-btn sauna-btn-primary"
            disabled={isAuthenticating}
          >
            {isAuthenticating ? "確認中..." : "確認"}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .sauna-password-overlay {
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

  .sauna-password-dialog {
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .sauna-password-dialog-title {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .sauna-password-dialog-desc {
    margin: 0 0 20px 0;
    font-size: 14px;
    color: #666;
  }

  .sauna-password-input {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    font-family: inherit;
    box-sizing: border-box;
    margin-bottom: 20px;
    transition: border-color 0.2s ease;
  }

  .sauna-password-input:focus {
    outline: none;
    border-color: #ff6b35;
  }

  .sauna-dialog-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .sauna-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
    font-size: 14px;
  }

  .sauna-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sauna-btn-primary {
    background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
    color: white;
  }

  .sauna-btn-primary:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
    transform: translateY(-1px);
  }

  .sauna-btn-secondary {
    background: #f0f0f0;
    color: #1a1a1a;
  }

  .sauna-btn-secondary:hover:not(:disabled) {
    background: #e0e0e0;
  }
</style>
