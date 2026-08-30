<script lang="ts">
  import { PaletteIcon, SecretIcon } from "./icons/index.svelte";
  import TripMembersEditor from "./TripMembersEditor.svelte";

  interface ThemeOption {
    id: string;
    name: string;
    description?: string;
  }
  interface PaletteOption { id: string; name: string; description?: string; colors: Record<string, string>; }

  interface Props {
    show: boolean;
    itineraryId: string;
    themes: ThemeOption[];
    palettes: PaletteOption[];
    selectedThemeId: string;
    selectedPaletteId: string;
    secretModeEnabled: boolean;
    secretModeOffset: number;
    packingEnabled: boolean;
    onThemeChange: (themeId: string) => void;
    onPaletteChange: (paletteId: string) => void;
    onSecretModeChange: (enabled: boolean, offset: number) => void;
    onPackingEnabledChange: (enabled: boolean) => void;
    onEditMetadata: () => void;
    onClose: () => void;
  }

  let {
    show,
    itineraryId,
    themes,
    palettes,
    selectedThemeId,
    selectedPaletteId,
    secretModeEnabled,
    secretModeOffset,
    packingEnabled,
    onThemeChange,
    onPaletteChange,
    onSecretModeChange,
    onPackingEnabledChange,
    onEditMetadata,
    onClose,
  }: Props = $props();

  let localSecretEnabled = $state(secretModeEnabled);
  let localSecretOffset = $state(secretModeOffset);
  let localThemeId = $state(selectedThemeId);
  let localPaletteId = $state(selectedPaletteId);
  let showThemeList = $state(false);
  let localPackingEnabled = $state(packingEnabled);

  $effect(() => {
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
    localThemeId = selectedThemeId;
    localPaletteId = selectedPaletteId;
    localPackingEnabled = packingEnabled;
  });

  async function handleSave() {
    await onThemeChange(localThemeId);
    await onPaletteChange(localPaletteId);
    await onSecretModeChange(localSecretEnabled, localSecretOffset);
    await onPackingEnabledChange(localPackingEnabled);
    onClose();
  }

  function handleCancel() {
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
    localThemeId = selectedThemeId;
    localPaletteId = selectedPaletteId;
    localPackingEnabled = packingEnabled;
    onClose();
  }

  function openMetadata() {
    handleCancel();
    onEditMetadata();
  }
</script>

{#if show}
  <section class="standard-settings-screen" aria-label="しおり設定">
    <header class="standard-settings-screen-header">
      <button type="button" class="standard-settings-screen-back" onclick={handleCancel}>‹ 戻る</button>
      <h2>しおり設定</h2>
      <button type="button" class="standard-settings-screen-close" onclick={handleCancel} aria-label="閉じる">×</button>
    </header>
    <div class="standard-settings-page">
    <div class="standard-settings-page-section">
      <div class="standard-settings-page-section-header">
        <span class="standard-settings-page-section-icon" aria-hidden="true">⌖</span>
        <h3>旅行先とタグ</h3>
      </div>
      <p class="standard-settings-page-description">このしおりに紐づく都道府県、エリア、旅のタグを編集します。</p>
      <button type="button" class="standard-btn standard-btn-secondary" onclick={openMetadata}>旅行先とタグを編集</button>
    </div>

    <div class="standard-settings-page-divider"></div>

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
        <h3>デザインテーマ</h3>
        <span
          class="standard-collapse-icon"
          class:expanded={showThemeList}>▼</span
        >
      </div>
      <p class="standard-settings-page-description">
        旅程の見せ方を選択できます。テーマを変えるとビューも切り替わります。
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
        <span class="standard-settings-page-section-icon" aria-hidden="true">●</span>
        <h3>しおりの色</h3>
      </div>
      <p class="standard-settings-page-description">デザインはそのまま、色合いだけを変更できます。</p>
      <div class="standard-settings-page-field">
        {#each palettes as palette}
          <label class="standard-settings-page-radio">
            <input type="radio" name="palette" value={palette.id} bind:group={localPaletteId} />
            <span style={`width:28px;height:28px;border-radius:50%;background:${palette.colors["--theme-primary"]};box-shadow:inset 0 0 0 6px ${palette.colors["--theme-bg"]}`}></span>
            <div class="standard-settings-page-radio-content"><span class="standard-settings-page-radio-title">{palette.name}</span>{#if palette.description}<span class="standard-settings-page-radio-desc">{palette.description}</span>{/if}</div>
            <div class="standard-settings-page-radio-check"></div>
          </label>
        {/each}
      </div>
    </div>

    <div class="standard-settings-page-divider"></div>

    <div class="standard-settings-page-section">
      <div class="standard-settings-page-section-header">
        <span class="standard-settings-page-section-icon" aria-hidden="true">▣</span>
        <h3>持ち物管理</h3>
      </div>
      <p class="standard-settings-page-description">オフにすると、下のメニューバーから持ち物を非表示にします。</p>
      <label class="standard-settings-page-toggle">
        <span class="standard-settings-page-toggle-label">持ち物管理を使う</span>
        <input type="checkbox" bind:checked={localPackingEnabled} class="standard-toggle-input" />
        <span class="standard-toggle-slider"></span>
      </label>
    </div>

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
  </section>
{/if}
