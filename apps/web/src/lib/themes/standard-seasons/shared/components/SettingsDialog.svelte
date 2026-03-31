<script lang="ts">
  import { PaletteIcon, SecretIcon } from "./icons/index.svelte";
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
    show,
    themes,
    selectedThemeId,
    secretModeEnabled,
    secretModeOffset,
    walicaUrl,
    onThemeChange,
    onSecretModeChange,
    onWalicaUpdate,
    onClose,
  }: Props = $props();

  let localSecretEnabled = $state(secretModeEnabled);
  let localSecretOffset = $state(secretModeOffset);
  let localWalicaUrl = $state(walicaUrl);
  let localThemeId = $state(selectedThemeId);

  $effect(() => {
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
    localWalicaUrl = walicaUrl;
    localThemeId = selectedThemeId;
  });

  function handleSave() {
    onThemeChange(localThemeId);
    onSecretModeChange(localSecretEnabled, localSecretOffset);
    onWalicaUpdate(localWalicaUrl);
    onClose();
  }

  function handleCancel() {
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
    localWalicaUrl = walicaUrl;
    localThemeId = selectedThemeId;
    onClose();
  }
</script>

<Dialog {show} title="設定" onClose={handleCancel}>
  <div class="standard-autumn-settings-page">
    <div class="standard-autumn-settings-page-section">
      <div class="standard-autumn-settings-page-section-header">
        {@html PaletteIcon}
        <h3>テーマ</h3>
      </div>
      <p class="standard-autumn-settings-page-description">
        しおりの見た目とスタイルを選択できます
      </p>
      <div class="standard-autumn-settings-page-field">
        {#each themes as theme}
          <label class="standard-autumn-settings-page-radio">
            <input
              type="radio"
              name="theme"
              value={theme.id}
              bind:group={localThemeId}
            />
            <div class="standard-autumn-settings-page-radio-content">
              <span class="standard-autumn-settings-page-radio-title"
                >{theme.name}</span
              >
              {#if theme.description}
                <span class="standard-autumn-settings-page-radio-desc"
                  >{theme.description}</span
                >
              {/if}
            </div>
            <div class="standard-autumn-settings-page-radio-check"></div>
          </label>
        {/each}
      </div>
    </div>

    <div class="standard-autumn-settings-page-divider"></div>

    <div class="standard-autumn-settings-page-section">
      <div class="standard-autumn-settings-page-section-header">
        {@html SecretIcon}
        <h3>シークレットモード</h3>
      </div>
      <p class="standard-autumn-settings-page-description">
        サプライズのために予定を一時的に隠すことができます
      </p>
      <label class="standard-autumn-settings-page-toggle">
        <span class="standard-autumn-settings-page-toggle-label">
          シークレットモードを有効にする
        </span>
        <input
          type="checkbox"
          bind:checked={localSecretEnabled}
          class="standard-autumn-toggle-input"
        />
        <span class="standard-autumn-toggle-slider"></span>
      </label>

      {#if localSecretEnabled}
        <div class="standard-autumn-settings-page-field">
          <label class="standard-autumn-settings-page-label">
            予定の表示開始時刻
          </label>
          <select
            bind:value={localSecretOffset}
            class="standard-autumn-settings-page-select"
          >
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
    </div>

    <div class="standard-autumn-settings-page-divider"></div>

    <div class="standard-autumn-settings-page-section">
      <div class="standard-autumn-settings-page-section-header">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          width="20"
          height="20"
        >
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
          />
        </svg>
        <h3>Walica連携</h3>
      </div>
      <p class="standard-autumn-settings-page-description">
        Walicaの割り勘グループと連携できます
      </p>
      <div class="standard-autumn-settings-page-field">
        <label class="standard-autumn-settings-page-label">
          Walica グループURL
        </label>
        <input
          type="text"
          bind:value={localWalicaUrl}
          placeholder="https://walica.jp/group/..."
          class="standard-autumn-settings-page-input"
        />
        <p class="standard-autumn-settings-page-hint">
          WalicaグループのURLを入力すると、しおりからWalicaにアクセスできます
        </p>
      </div>
    </div>

    <div class="standard-autumn-settings-page-actions">
      <button
        onclick={handleCancel}
        class="standard-autumn-btn standard-autumn-btn-secondary"
      >
        キャンセル
      </button>
      <button
        onclick={handleSave}
        class="standard-autumn-btn standard-autumn-btn-primary"
      >
        保存
      </button>
    </div>
  </div>
</Dialog>
