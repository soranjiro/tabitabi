<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    HomeIcon,
    WalicaIcon,
    ViewIcon,
    EditIcon,
    SettingsIcon,
  } from "./icons/index.svelte";
  import SettingsMenu from "./SettingsMenu.svelte";

  interface ThemeOption {
    id: string;
    name: string;
    description?: string;
  }

  interface Props {
    hasEditPermission: boolean;
    walicaId?: string | null;
    themes: ThemeOption[];
    selectedThemeId: string;
    secretModeEnabled: boolean;
    secretModeOffset: number;
    walicaUrl: string;
    onEditModeToggle: () => void;
    onThemeChange: (themeId: string) => void;
    onSecretModeChange: (enabled: boolean, offset: number) => void;
    onWalicaUpdate: (url: string) => void;
    onWalicaOpen: () => void;
  }

  let {
    hasEditPermission,
    walicaId,
    themes,
    selectedThemeId,
    secretModeEnabled,
    secretModeOffset,
    walicaUrl,
    onEditModeToggle,
    onThemeChange,
    onSecretModeChange,
    onWalicaUpdate,
    onWalicaOpen,
  }: Props = $props();

  let showSettingsMenu = $state(false);
  let showThemeSelect = $state(false);

  function handleSettingsClick() {
    showSettingsMenu = !showSettingsMenu;
    showThemeSelect = false;
  }

  function handleShowThemeSelect() {
    showThemeSelect = true;
    showSettingsMenu = false;
  }

  function handleThemeChange(themeId: string) {
    showThemeSelect = false;
    onThemeChange(themeId);
  }

  function handleEditModeToggle() {
    showSettingsMenu = false;
    onEditModeToggle();
  }
</script>

<nav class="standard-autumn-bottom-nav" aria-label="フッターメニュー">
  <button
    class="standard-autumn-bottom-btn"
    title="ホーム"
    aria-label="ホーム"
    onclick={() => goto("/")}
  >
    {@html HomeIcon}
    <span>Home</span>
  </button>

  {#if walicaId}
    <button
      class="standard-autumn-bottom-btn"
      title="Walica"
      aria-label="Walica"
      onclick={onWalicaOpen}
    >
      {@html WalicaIcon}
      <span>Walica</span>
    </button>
  {/if}

  <div class="standard-autumn-btn-wrapper">
    <button
      class="standard-autumn-bottom-btn"
      title={hasEditPermission
        ? "閲覧モードに切り替え"
        : "編集モードに切り替え"}
      aria-label={hasEditPermission
        ? "閲覧モードに切り替え"
        : "編集モードに切り替え"}
      onclick={handleEditModeToggle}
    >
      {#if hasEditPermission}
        {@html ViewIcon}
        <span>View</span>
      {:else}
        {@html EditIcon}
        <span>Edit</span>
      {/if}
    </button>
  </div>

  {#if hasEditPermission}
    <div class="standard-autumn-btn-wrapper">
      <button
        class="standard-autumn-bottom-btn"
        title="設定"
        aria-label="設定"
        onclick={handleSettingsClick}
      >
        {@html SettingsIcon}
        <span>Settings</span>
      </button>
      {#if showSettingsMenu}
        <SettingsMenu
          {themes}
          {selectedThemeId}
          {secretModeEnabled}
          {secretModeOffset}
          {walicaUrl}
          {showThemeSelect}
          onThemeChange={handleThemeChange}
          {onSecretModeChange}
          {onWalicaUpdate}
          onShowThemeSelect={handleShowThemeSelect}
          onClose={() => (showSettingsMenu = false)}
        />
      {/if}
      {#if showThemeSelect}
        <div class="standard-autumn-theme-select-popup">
          <label for="theme-select" class="standard-autumn-theme-select-label"
            >テーマを選択</label
          >
          <select
            id="theme-select"
            value={selectedThemeId}
            onchange={(e) =>
              handleThemeChange((e.target as HTMLSelectElement).value)}
            class="standard-autumn-theme-select-input"
          >
            {#each themes as theme}
              <option value={theme.id}>{theme.name}</option>
            {/each}
          </select>
        </div>
      {/if}
    </div>
  {/if}
</nav>
