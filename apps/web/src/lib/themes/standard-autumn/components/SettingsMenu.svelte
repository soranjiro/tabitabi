<script lang="ts">
  import { PaletteIcon, SecretIcon } from "./icons/index.svelte";

  interface ThemeOption {
    id: string;
    name: string;
    description?: string;
  }

  interface Props {
    themes: ThemeOption[];
    selectedThemeId: string;
    secretModeEnabled: boolean;
    secretModeOffset: number;
    walicaUrl: string;
    showThemeSelect: boolean;
    onThemeChange: (themeId: string) => void;
    onSecretModeChange: (enabled: boolean, offset: number) => void;
    onWalicaUpdate: (url: string) => void;
    onShowThemeSelect: () => void;
    onClose: () => void;
  }

  let {
    themes,
    selectedThemeId,
    secretModeEnabled,
    secretModeOffset,
    walicaUrl,
    showThemeSelect,
    onThemeChange,
    onSecretModeChange,
    onWalicaUpdate,
    onShowThemeSelect,
    onClose,
  }: Props = $props();

  let localSecretEnabled = $state(secretModeEnabled);
  let localSecretOffset = $state(secretModeOffset);
  let localWalicaUrl = $state(walicaUrl);

  $effect(() => {
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
    localWalicaUrl = walicaUrl;
  });

  function handleSecretToggle() {
    localSecretEnabled = !localSecretEnabled;
    onSecretModeChange(localSecretEnabled, localSecretOffset);
  }

  function handleSecretOffsetChange() {
    onSecretModeChange(localSecretEnabled, localSecretOffset);
  }

  function handleWalicaBlur() {
    onWalicaUpdate(localWalicaUrl);
  }

  function handleThemeSelect(e: Event) {
    const target = e.target as HTMLSelectElement;
    onThemeChange(target.value);
  }
</script>

<div class="standard-autumn-settings-menu">
  <button onclick={onShowThemeSelect} class="standard-autumn-settings-item">
    {@html PaletteIcon}
    テーマを変更
  </button>

  <div class="standard-autumn-settings-divider"></div>

  <div class="standard-autumn-settings-group">
    <label class="standard-autumn-settings-toggle">
      <span class="standard-autumn-settings-label-text">
        {@html SecretIcon}
        シークレットモード
      </span>
      <input
        type="checkbox"
        bind:checked={localSecretEnabled}
        onchange={handleSecretToggle}
        class="standard-autumn-toggle-input"
      />
      <span class="standard-autumn-toggle-slider"></span>
    </label>

    {#if localSecretEnabled}
      <div class="standard-autumn-settings-subitem">
        <span class="standard-autumn-settings-sublabel">表示開始:</span>
        <select
          bind:value={localSecretOffset}
          onchange={handleSecretOffsetChange}
          class="standard-autumn-settings-select"
        >
          <option value={0}>即時</option>
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

  <div class="standard-autumn-settings-divider"></div>

  <div class="standard-autumn-settings-group">
    <label class="standard-autumn-settings-label">
      <span class="standard-autumn-settings-label-text"> Walica URL </span>
      <input
        type="text"
        bind:value={localWalicaUrl}
        onblur={handleWalicaBlur}
        placeholder="https://walica.jp/group/..."
        class="standard-autumn-input standard-autumn-settings-input"
      />
    </label>
  </div>
</div>

{#if showThemeSelect}
  <div class="standard-autumn-theme-select-popup">
    <label for="theme-select" class="standard-autumn-theme-select-label"
      >テーマを選択</label
    >
    <select
      id="theme-select"
      value={selectedThemeId}
      onchange={handleThemeSelect}
      class="standard-autumn-theme-select-input"
    >
      {#each themes as theme}
        <option value={theme.id}>{theme.name}</option>
      {/each}
    </select>
  </div>
{/if}
