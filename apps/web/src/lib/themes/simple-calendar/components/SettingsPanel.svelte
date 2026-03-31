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
  <h3>Walica連携</h3>
  <div class="setting-item">
    <label for="walica-group-id">グループID</label>
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
</section>

<section class="settings-section">
  <h3>シークレットモード</h3>
  <div class="setting-item">
    <label>
      <input type="checkbox" bind:checked={localSecretEnabled} />
      シークレットモードを有効化
    </label>
    {#if localSecretEnabled}
      <div class="secret-setting">
        <label for="secret-offset">公開まで待機する時間（分）</label>
        <input
          id="secret-offset"
          type="number"
          bind:value={localSecretOffset}
          min="1"
          step="1"
        />
      </div>
    {/if}
    <button
      class="btn-save"
      onclick={() => onSecretModeUpdate(localSecretEnabled, localSecretOffset)}
    >
      保存
    </button>
  </div>
</section>

<style>
  .settings-section {
    padding: 16px;
    border-bottom: 1px solid #e5e5e5;
  }

  .settings-section h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
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
    font-size: 12px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 6px;
  }

  .setting-item input[type="text"],
  .setting-item input[type="number"] {
    width: 100%;
    padding: 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 13px;
    box-sizing: border-box;
    margin-bottom: 8px;
  }

  .setting-item input[type="checkbox"] {
    margin-right: 8px;
  }

  .btn-save {
    width: 100%;
    padding: 8px 12px;
    border: none;
    border-radius: 6px;
    background: #2563eb;
    color: white;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;
  }

  .btn-save:hover {
    background: #1d4ed8;
  }

  .secret-setting {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e5e5e5;
  }

  .secret-setting label {
    margin-bottom: 6px;
  }

  .secret-setting input {
    margin-bottom: 0;
  }
</style>
