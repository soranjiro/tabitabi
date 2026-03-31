<script lang="ts">
  import Dialog from "./Dialog.svelte";

  interface ThemeOption {
    id: string;
    name: string;
    description?: string;
  }

  interface Props {
    show: boolean;
    themes: ThemeOption[];
    selectedThemeId: string;
    secretModeEnabled: boolean;
    secretModeOffset: number;
    walicaUrl: string;
    onThemeChange: (themeId: string) => void;
    onSecretModeChange: (enabled: boolean, offset: number) => void;
    onWalicaUpdate: (url: string) => void;
    onClose: () => void;
  }

  let {
    show, themes, selectedThemeId, secretModeEnabled, secretModeOffset,
    walicaUrl, onThemeChange, onSecretModeChange, onWalicaUpdate, onClose,
  }: Props = $props();

  let localThemeId = $state(selectedThemeId);
  let localSecretEnabled = $state(secretModeEnabled);
  let localSecretOffset = $state(secretModeOffset);
  let localWalicaUrl = $state(walicaUrl);

  $effect(() => {
    localThemeId = selectedThemeId;
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
    localWalicaUrl = walicaUrl;
  });

  function handleSave() {
    onThemeChange(localThemeId);
    onSecretModeChange(localSecretEnabled, localSecretOffset);
    onWalicaUpdate(localWalicaUrl);
    onClose();
  }

  function handleCancel() {
    localThemeId = selectedThemeId;
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
    localWalicaUrl = walicaUrl;
    onClose();
  }
</script>

<Dialog {show} title="設定" onClose={handleCancel}>
  {#snippet children()}
    <div class="ss-settings">
      <section class="ss-settings-section">
        <h4 class="ss-settings-section-title">テーマ</h4>
        <p class="ss-settings-desc">しおりの見た目を選択できます</p>
        <div class="ss-settings-field">
          {#each themes as theme}
            <label class="ss-radio-label">
              <input type="radio" name="ss-theme" value={theme.id} bind:group={localThemeId} />
              <span class="ss-radio-name">{theme.name}</span>
              {#if theme.description}
                <span class="ss-radio-desc">{theme.description}</span>
              {/if}
            </label>
          {/each}
        </div>
      </section>

      <div class="ss-settings-divider"></div>

      <section class="ss-settings-section">
        <h4 class="ss-settings-section-title">シークレットモード</h4>
        <p class="ss-settings-desc">サプライズのために予定を一時的に隠せます</p>
        <label class="ss-toggle-label">
          <span>シークレットモードを有効にする</span>
          <input type="checkbox" bind:checked={localSecretEnabled} class="ss-toggle-input" />
          <span class="ss-toggle-slider"></span>
        </label>
        {#if localSecretEnabled}
          <div class="ss-settings-field">
            <label class="ss-label">予定の表示開始時刻</label>
            <select bind:value={localSecretOffset} class="ss-select">
              <option value={0}>予定時刻</option>
              <option value={15}>15分前</option>
              <option value={30}>30分前</option>
              <option value={60}>1時間前</option>
              <option value={120}>2時間前</option>
              <option value={180}>3時間前</option>
              <option value={300}>5時間前</option>
              <option value={720}>12時間前</option>
              <option value={1440}>24時間前</option>
            </select>
          </div>
        {/if}
      </section>

      <div class="ss-settings-divider"></div>

      <section class="ss-settings-section">
        <h4 class="ss-settings-section-title">Walica連携</h4>
        <p class="ss-settings-desc">Walicaの割り勘グループと連携できます</p>
        <div class="ss-settings-field">
          <label class="ss-label">Walica グループURL</label>
          <input type="text" bind:value={localWalicaUrl} placeholder="https://walica.jp/group/..." class="ss-input" />
          <p class="ss-hint">WalicaグループのURLを入力すると、しおりからWalicaにアクセスできます</p>
        </div>
      </section>
    </div>
  {/snippet}
  {#snippet actions()}
    <button onclick={handleCancel} class="ss-btn ss-btn-secondary">キャンセル</button>
    <button onclick={handleSave} class="ss-btn ss-btn-primary">保存</button>
  {/snippet}
</Dialog>
