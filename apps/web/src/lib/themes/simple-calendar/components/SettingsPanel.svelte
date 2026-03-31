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
    max-width: 600px;
    margin: 0 auto;
  }

  .settings-section {
    padding: 16px;
    border-bottom: 1px solid #e5e5e5;
    max-width: 100%;
  }

  .settings-section h3 {
    margin: 0 0 12px 0;
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
  }

  .setting-item {
    background: #f9f9f9;
    padding: 12px;
    border-radius: 6px;
  }

  .setting-item label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;
  }

  .checkbox-group {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .checkbox-group input[type="checkbox"] {
    cursor: pointer;
    width: 16px;
    height: 16px;
  }

  .checkbox-group label {
    margin: 0;
    cursor: pointer;
    font-weight: 500;
  }

  .input-group {
    display: flex;
    gap: 8px;
  }

  .setting-item input[type="text"],
  .setting-item input[type="number"] {
    flex: 1;
    min-width: 0;
    padding: 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
  }

  .btn-save {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    background: #2563eb;
    color: white;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .btn-save:hover {
    background: #1d4ed8;
  }

  .btn-save:active {
    transform: scale(0.98);
  }

  .secret-setting {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e5e5e5;
  }

  .secret-setting label {
    margin-bottom: 8px;
  }

  @media (max-width: 480px) {
    .input-group {
      flex-direction: column;
    }

    .btn-save {
      width: 100%;
    }
  }
</style>
