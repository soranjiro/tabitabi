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
    showThemeSelect: boolean;
    onThemeChange: (themeId: string) => void;
    onSecretModeChange: (enabled: boolean, offset: number) => void;
    onShowThemeSelect: () => void;
    onClose: () => void;
  }

  let {
    themes,
    selectedThemeId,
    secretModeEnabled,
    secretModeOffset,
    showThemeSelect,
    onThemeChange,
    onSecretModeChange,
    onShowThemeSelect,
    onClose,
  }: Props = $props();

  let localSecretEnabled = $state(secretModeEnabled);
  let localSecretOffset = $state(secretModeOffset);

  $effect(() => {
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
  });

  function handleSecretToggle() {
    onSecretModeChange(localSecretEnabled, localSecretOffset);
  }

  function handleSecretOffsetChange() {
    onSecretModeChange(localSecretEnabled, localSecretOffset);
  }

  function handleShowThemeSelect() {
    onShowThemeSelect();
  }
</script>

<div class="standard-settings-menu">
  <button onclick={handleShowThemeSelect} class="standard-settings-item">
    {@html PaletteIcon}
    テーマを変更
  </button>

  <div class="standard-settings-divider"></div>

  <div class="standard-settings-group">
    <label class="standard-settings-toggle">
      <span class="standard-settings-label-text">
        {@html SecretIcon}
        シークレットモード
      </span>
      <input
        type="checkbox"
        bind:checked={localSecretEnabled}
        onchange={handleSecretToggle}
        class="standard-toggle-input"
      />
      <span class="standard-toggle-slider"></span>
    </label>

    {#if localSecretEnabled}
      <div class="standard-settings-subitem">
        <span class="standard-settings-sublabel">表示開始:</span>
        <select
          bind:value={localSecretOffset}
          onchange={handleSecretOffsetChange}
          class="standard-settings-select"
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

</div>
