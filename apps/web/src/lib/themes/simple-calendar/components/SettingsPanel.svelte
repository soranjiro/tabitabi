<script lang="ts">
  interface Props {
    walicaId: string;
    secretModeEnabled: boolean;
    secretModeOffset: number;
    onWalicaUpdate: (id: string) => void;
    onSecretModeUpdate: (enabled: boolean, offset: number) => void;
  }

  let {
    walicaId,
    secretModeEnabled,
    secretModeOffset,
    onWalicaUpdate,
    onSecretModeUpdate,
  }: Props = $props();
  let localWalicaId = $state(walicaId);
  let localSecretEnabled = $state(secretModeEnabled);
  let localSecretOffset = $state(secretModeOffset);
</script>

<section class="settings-section">
  <h3>💰 Walica連携</h3>
  <div class="setting-item">
    <label for="walica-group-id">グループID</label>
    <div class="input-group">
      <input
        id="walica-group-id"
        type="text"
        bind:value={localWalicaId}
        placeholder="グループIDを入力"
      />
      <button class="btn-save" onclick={() => onWalicaUpdate(localWalicaId)}>
        保存
      </button>
    </div>
  </div>
</section>

<section class="settings-section">
  <h3>🔐 シークレットモード</h3>
  <div class="setting-item">
    <div class="checkbox-group">
      <input
        id="secret-toggle"
        type="checkbox"
        bind:checked={localSecretEnabled}
      />
      <label for="secret-toggle">シークレットモードを有効化</label>
    </div>
    {#if localSecretEnabled}
      <div class="secret-setting">
        <label for="secret-offset">公開まで待機する時間（分）</label>
        <div class="input-group">
          <input
            id="secret-offset"
            type="number"
            bind:value={localSecretOffset}
            min="1"
            step="1"
          />
          <button
            class="btn-save"
            onclick={() =>
              onSecretModeUpdate(localSecretEnabled, localSecretOffset)}
          >
            保存
          </button>
        </div>
      </div>
    {:else}
      <button
        class="btn-save"
        onclick={() => onSecretModeUpdate(localSecretEnabled, localSecretOffset)}
      >
        保存
      </button>
    {/if}
  </div>
</section>

<style>
  :global(.main-content) {
    width: 100%;
  }

  :global(.section) {
    max-width: 900px;
  }

  .settings-section {
    padding: 20px;
    border-bottom: 1px solid #e5e5e5;
    max-width: 100%;
  }

  .settings-section:last-of-type {
    border-bottom: none;
  }

  .settings-section h3 {
    margin: 0 0 16px 0;
    font-size: 16px;
    font-weight: 700;
    color: #1f2937;
  }

  .setting-item {
    background: linear-gradient(135deg, #f9f9f9 0%, #fafbfc 100%);
    padding: 16px;
    border-radius: 8px;
    border: 1px solid #e5e5e5;
  }

  .setting-item label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 8px;
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
  }

  .checkbox-group input[type="checkbox"] {
    cursor: pointer;
    width: 18px;
    height: 18px;
    accent-color: #2563eb;
  }

  .checkbox-group label {
    margin: 0;
    cursor: pointer;
    font-weight: 500;
    user-select: none;
  }

  .input-group {
    display: flex;
    gap: 12px;
    align-items: flex-end;
  }

  .setting-item input[type="text"],
  .setting-item input[type="number"] {
    flex: 1;
    min-width: 200px;
    padding: 10px;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
    transition: all 0.2s;
  }

  .setting-item input[type="text"]:focus,
  .setting-item input[type="number"]:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    background-color: #fafbff;
  }

  .btn-save {
    padding: 10px 24px;
    border: none;
    border-radius: 6px;
    background: #2563eb;
    color: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-save:hover {
    background: #1d4ed8;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
  }

  .btn-save:active {
    transform: translateY(0);
  }

  .secret-setting {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e5e5e5;
  }

  .secret-setting label {
    margin-bottom: 8px;
  }

  @media (min-width: 768px) {
    .input-group {
      flex-direction: row;
    }

    .btn-save {
      flex-shrink: 0;
    }
  }

  @media (max-width: 640px) {
    .settings-section {
      padding: 16px;
    }

    .input-group {
      flex-direction: column;
      align-items: stretch;
    }

    .setting-item input[type="text"],
    .setting-item input[type="number"] {
      min-width: 0;
    }

    .btn-save {
      width: 100%;
    }
  }
</style>
