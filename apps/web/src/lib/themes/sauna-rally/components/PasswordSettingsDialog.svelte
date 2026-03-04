<script lang="ts">
  interface Props {
    show: boolean;
    isPasswordProtected: boolean;
    onSave: (password: string | null) => Promise<void>;
    onClose: () => void;
  }

  let { show, isPasswordProtected, onSave, onClose }: Props = $props();

  let newPassword = $state("");
  let confirmPassword = $state("");
  let isSaving = $state(false);
  let errorMessage = $state("");

  // パスワードを削除するかどうか
  let removePassword = $state(false);

  function reset() {
    newPassword = "";
    confirmPassword = "";
    isSaving = false;
    errorMessage = "";
    removePassword = false;
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSave() {
    errorMessage = "";

    if (removePassword) {
      isSaving = true;
      await onSave(null);
      reset();
      return;
    }

    if (!newPassword) {
      errorMessage = "パスワードを入力してください";
      return;
    }
    if (newPassword.length < 4) {
      errorMessage = "パスワードは4文字以上で設定してください";
      return;
    }
    if (newPassword !== confirmPassword) {
      errorMessage = "パスワードが一致しません";
      return;
    }

    isSaving = true;
    await onSave(newPassword);
    reset();
  }
</script>

{#if show}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="sauna-ps-overlay" onclick={handleClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="sauna-ps-dialog" onclick={(e) => e.stopPropagation()}>
      <h3 class="sauna-ps-title">🔑 編集パスワード設定</h3>

      {#if isPasswordProtected}
        <p class="sauna-ps-desc">現在パスワードが設定されています。変更または削除できます。</p>

        <label class="sauna-ps-remove-label">
          <input type="checkbox" bind:checked={removePassword} class="sauna-ps-checkbox" />
          <span>パスワードを削除する</span>
        </label>
      {:else}
        <p class="sauna-ps-desc">パスワードを設定すると、編集時にパスワードが必要になります。</p>
      {/if}

      {#if !removePassword}
        <div class="sauna-ps-field">
          <label class="sauna-ps-label" for="new-password">
            {isPasswordProtected ? "新しいパスワード" : "パスワード"}
          </label>
          <input
            id="new-password"
            type="password"
            bind:value={newPassword}
            placeholder="4文字以上"
            class="sauna-ps-input"
            disabled={isSaving}
          />
        </div>

        <div class="sauna-ps-field">
          <label class="sauna-ps-label" for="confirm-password">確認用パスワード</label>
          <input
            id="confirm-password"
            type="password"
            bind:value={confirmPassword}
            placeholder="もう一度入力"
            class="sauna-ps-input"
            disabled={isSaving}
            onkeydown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
      {/if}

      {#if errorMessage}
        <p class="sauna-ps-error">{errorMessage}</p>
      {/if}

      <div class="sauna-ps-actions">
        <button
          type="button"
          class="sauna-btn sauna-btn-secondary"
          onclick={handleClose}
          disabled={isSaving}
        >
          キャンセル
        </button>
        <button
          type="button"
          class="sauna-btn {removePassword ? 'sauna-btn-danger' : 'sauna-btn-primary'}"
          onclick={handleSave}
          disabled={isSaving}
        >
          {#if isSaving}
            保存中...
          {:else if removePassword}
            削除する
          {:else}
            設定する
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .sauna-ps-overlay {
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

  .sauna-ps-dialog {
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .sauna-ps-title {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: #1a1a1a;
  }

  .sauna-ps-desc {
    margin: 0 0 20px 0;
    font-size: 14px;
    color: #666;
    line-height: 1.5;
  }

  .sauna-ps-remove-label {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-size: 14px;
    color: #e53935;
    cursor: pointer;
  }

  .sauna-ps-checkbox {
    width: 16px;
    height: 16px;
    cursor: pointer;
    accent-color: #e53935;
  }

  .sauna-ps-field {
    margin-bottom: 16px;
  }

  .sauna-ps-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #444;
    margin-bottom: 6px;
  }

  .sauna-ps-input {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    font-family: inherit;
    box-sizing: border-box;
    transition: border-color 0.2s ease;
  }

  .sauna-ps-input:focus {
    outline: none;
    border-color: #ff6b35;
  }

  .sauna-ps-input:disabled {
    background: #f5f5f5;
  }

  .sauna-ps-error {
    margin: 0 0 16px 0;
    font-size: 13px;
    color: #e53935;
  }

  .sauna-ps-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 8px;
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

  .sauna-btn-danger {
    background: #e53935;
    color: white;
  }

  .sauna-btn-danger:hover:not(:disabled) {
    background: #c62828;
  }
</style>
