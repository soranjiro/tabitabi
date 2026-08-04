<script lang="ts">
  import { goto } from "$app/navigation";
  import {
    HomeIcon,
    ViewIcon,
    EditIcon,
    SettingsIcon,
  } from "./icons/index.svelte";

  interface ThemeOption {
    id: string;
    name: string;
    description?: string;
  }

  interface Props {
    hasEditPermission: boolean;
    canRequestEdit?: boolean;
    themes: ThemeOption[];
    selectedThemeId: string;
    secretModeEnabled: boolean;
    secretModeOffset: number;
    onEditModeToggle: () => void;
    onThemeChange: (themeId: string) => void;
    onSecretModeChange: (enabled: boolean, offset: number) => void;
    onMoneyOpen: () => void;
    onViewModeClick?: () => void;
    onShowThemeSelector?: () => void;
    onSettingsClick?: () => void;
  }

  let {
    hasEditPermission,
    canRequestEdit = true,
    themes,
    selectedThemeId,
    secretModeEnabled,
    secretModeOffset,
    onEditModeToggle,
    onThemeChange,
    onSecretModeChange,
    onMoneyOpen,
    onViewModeClick,
    onShowThemeSelector,
    onSettingsClick,
  }: Props = $props();

  let showSettingsMenu = $state(false);
  let showThemeSelect = $state(false);

  const ModeIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm0 6h18v2H3v-2zm0 6h18v2H3v-2z"/></svg>`;

  function handleSettingsClick() {
    showSettingsMenu = false;
    showThemeSelect = false;
    if (onSettingsClick) {
      onSettingsClick();
    }
  }

  function handleShowThemeSelect() {
    showSettingsMenu = false;
    if (onShowThemeSelector) {
      onShowThemeSelector();
    }
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

<nav class="standard-bottom-nav" aria-label="フッターメニュー">
  <button
    class="standard-bottom-btn"
    title="ホーム"
    aria-label="ホーム"
    onclick={() => goto("/")}
  >
    {@html HomeIcon}
    <span>Home</span>
  </button>

  <button
    class="standard-bottom-btn"
    title="お金の管理"
    aria-label="お金の管理"
    onclick={onMoneyOpen}
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 16.93V20h-2v-1.07A4.1 4.1 0 0 1 7.8 15h2.05c.08.7.68 1.18 1.66 1.18.9 0 1.5-.38 1.5-.98 0-.54-.4-.82-1.75-1.12-1.87-.42-3.08-1.25-3.08-2.88 0-1.43 1.09-2.54 2.82-2.8V5h2v1.13A3.72 3.72 0 0 1 15.9 9h-2.02c-.1-.58-.6-.98-1.44-.98-.8 0-1.3.35-1.3.88 0 .5.42.78 1.77 1.1 1.88.43 3.05 1.3 3.05 2.94 0 1.5-1.17 2.68-2.96 2.99Z"/></svg>
    <span>Money</span>
  </button>

  <div class="standard-btn-wrapper">
    <button
      class="standard-bottom-btn"
      title="ビューモード選択"
      aria-label="ビューモード選択"
      onclick={onViewModeClick}
    >
      {@html ModeIcon}
      <span>Mode</span>
    </button>
  </div>

  {#if hasEditPermission}
    <button
      class="standard-bottom-btn"
      title="閲覧モードに切り替え"
      aria-label="閲覧モードに切り替え"
      onclick={handleEditModeToggle}
    >
      {@html ViewIcon}
      <span>View</span>
    </button>
  {:else if canRequestEdit}
    <button
      class="standard-bottom-btn"
      title="編集モードに切り替え"
      aria-label="編集モードに切り替え"
      onclick={handleEditModeToggle}
    >
      {@html EditIcon}
      <span>Edit</span>
    </button>
  {/if}

  {#if hasEditPermission}
    <div class="standard-btn-wrapper">
      <button
        class="standard-bottom-btn"
        title="設定"
        aria-label="設定"
        onclick={handleSettingsClick}
      >
        {@html SettingsIcon}
        <span>Settings</span>
      </button>
      {#if showThemeSelect}
        <div class="standard-theme-select-popup">
          <label for="theme-select" class="standard-theme-select-label"
            >テーマを選択</label
          >
          <select
            id="theme-select"
            value={selectedThemeId}
            onchange={(e) =>
              handleThemeChange((e.target as HTMLSelectElement).value)}
            class="standard-theme-select-input"
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
