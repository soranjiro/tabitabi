<script lang="ts">
  import { PaletteIcon, SecretIcon } from "./icons/index.svelte";
  import Dialog from "./Dialog.svelte";
  import { VIEW_MODE_OPTIONS, type ViewMode } from "../utils/storage";
  import TripMembersEditor from "./TripMembersEditor.svelte";

  interface ThemeOption {
    id: string;
    name: string;
    description?: string;
  }

  interface Props {
    show: boolean;
    itineraryId: string;
    themes: ThemeOption[];
    selectedThemeId: string;
    defaultViewMode: ViewMode;
    secretModeEnabled: boolean;
    secretModeOffset: number;
    onThemeChange: (themeId: string) => void;
    onDefaultViewModeChange: (mode: ViewMode) => void;
    onSecretModeChange: (enabled: boolean, offset: number) => void;
    onClose: () => void;
  }

  let {
    show,
    itineraryId,
    themes,
    selectedThemeId,
    defaultViewMode,
    secretModeEnabled,
    secretModeOffset,
    onThemeChange,
    onDefaultViewModeChange,
    onSecretModeChange,
    onClose,
  }: Props = $props();

  let localSecretEnabled = $state(secretModeEnabled);
  let localSecretOffset = $state(secretModeOffset);
  let localThemeId = $state(selectedThemeId);
  let localDefaultViewMode = $state<ViewMode>(defaultViewMode);
  let showThemeList = $state(false);

  $effect(() => {
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
    localThemeId = selectedThemeId;
    localDefaultViewMode = defaultViewMode;
  });

  function handleSave() {
    onThemeChange(localThemeId);
    onDefaultViewModeChange(localDefaultViewMode);
    onSecretModeChange(localSecretEnabled, localSecretOffset);
    onClose();
  }

  function handleCancel() {
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
    localThemeId = selectedThemeId;
    localDefaultViewMode = defaultViewMode;
    onClose();
  }
</script>

<Dialog {show} title="設定" onClose={handleCancel}>
  <div class="standard-settings-page">
    <div class="standard-settings-page-section">
      <div class="standard-settings-page-section-header">
        <span class="standard-settings-page-section-icon" aria-hidden="true">👥</span>
        <h3>旅行メンバー</h3>
      </div>
      <p class="standard-settings-page-description">
        持ち物とお金の管理で共通して使う、旅行内だけのメンバーです。
      </p>
      <TripMembersEditor {show} {itineraryId} />
    </div>

    <div class="standard-settings-page-divider"></div>

    <div class="standard-settings-page-section">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="standard-settings-page-section-header standard-settings-page-section-header-clickable"
        onclick={() => (showThemeList = !showThemeList)}
      >
        {@html PaletteIcon}
        <h3>テーマ</h3>
        <span
          class="standard-collapse-icon"
          class:expanded={showThemeList}>▼</span
        >
      </div>
      <p class="standard-settings-page-description">
        しおりの見た目とスタイルを選択できます
      </p>
      {#if showThemeList}
        <div class="standard-settings-page-field">
          {#each themes as theme}
            <label class="standard-settings-page-radio">
              <input
                type="radio"
                name="theme"
                value={theme.id}
                bind:group={localThemeId}
              />
              <div class="standard-settings-page-radio-content">
                <span class="standard-settings-page-radio-title"
                  >{theme.name}</span
                >
                {#if theme.description}
                  <span class="standard-settings-page-radio-desc"
                    >{theme.description}</span
                  >
                {/if}
              </div>
              <div class="standard-settings-page-radio-check"></div>
            </label>
          {/each}
        </div>
      {/if}
    </div>

    <div class="standard-settings-page-divider"></div>

    <div class="standard-settings-page-section">
      <div class="standard-settings-page-section-header">
        <span class="standard-settings-page-section-icon" aria-hidden="true">▤</span>
        <h3>初期表示</h3>
      </div>
      <p class="standard-settings-page-description">
        しおりを開いたときに最初に表示する画面です。共有した相手にも反映されます。
      </p>
      <div class="standard-settings-page-field">
        {#each VIEW_MODE_OPTIONS as option}
          <label class="standard-settings-page-radio">
            <input
              type="radio"
              name="default-view-mode"
              value={option.id}
              bind:group={localDefaultViewMode}
            />
            <div class="standard-settings-page-radio-content">
              <span class="standard-settings-page-radio-title">{option.icon} {option.label}</span>
            </div>
            <div class="standard-settings-page-radio-check"></div>
          </label>
        {/each}
      </div>
    </div>

    <div class="standard-settings-page-divider"></div>

    <div class="standard-settings-page-section">
      <div class="standard-settings-page-section-header">
        {@html SecretIcon}
        <h3>シークレットモード</h3>
      </div>
      <p class="standard-settings-page-description">
        サプライズのために予定を一時的に隠すことができます
      </p>
      <label class="standard-settings-page-toggle">
        <span class="standard-settings-page-toggle-label">
          シークレットモードを有効にする
        </span>
        <input
          type="checkbox"
          bind:checked={localSecretEnabled}
          class="standard-toggle-input"
        />
        <span class="standard-toggle-slider"></span>
      </label>

      {#if localSecretEnabled}
        <div class="standard-settings-page-field">
          <label
            for="secret-offset-select"
            class="standard-settings-page-label"
          >
            予定の表示開始時刻
          </label>
          <select
            id="secret-offset-select"
            bind:value={localSecretOffset}
            class="standard-settings-page-select"
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

    <div class="standard-settings-page-actions">
      <button
        onclick={handleCancel}
        class="standard-btn standard-btn-secondary"
      >
        キャンセル
      </button>
      <button
        onclick={handleSave}
        class="standard-btn standard-btn-primary"
      >
        保存
      </button>
    </div>
  </div>
</Dialog>
