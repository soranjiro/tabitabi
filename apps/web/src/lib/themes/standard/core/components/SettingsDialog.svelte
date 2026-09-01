<script lang="ts">
  import { page } from "$app/stores";
  import { invalidateAll } from "$app/navigation";
  import type { ItineraryResponse } from "@tabitabi/types";
  import { itineraryApi } from "$lib/api/itinerary";
  import { ITINERARY_BACKGROUND_PRESETS } from "$lib/itinerary-backgrounds";
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
    onThemeChange: (themeId: string) => void | Promise<void>;
    onPaletteChange: (paletteId: string) => void | Promise<void>;
    onSecretModeChange: (enabled: boolean, offset: number) => void | Promise<void>;
    onPackingEnabledChange: (enabled: boolean) => void | Promise<void>;
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

  const pageItinerary = $derived(($page.data?.itinerary ?? null) as ItineraryResponse | null);
  const currentBackgroundImage = $derived(
    pageItinerary?.id === itineraryId ? (pageItinerary.background_image ?? null) : null,
  );

  let localSecretEnabled = $state(secretModeEnabled);
  let localSecretOffset = $state(secretModeOffset);
  let localThemeId = $state(selectedThemeId);
  let localPaletteId = $state(selectedPaletteId);
  let localBackgroundImage = $state("");
  let showThemeList = $state(false);
  let showPaletteList = $state(false);
  let showBackgroundList = $state(false);
  let localPackingEnabled = $state(packingEnabled);
  let wasOpen = $state(false);
  let isSaving = $state(false);
  let saveError = $state("");
  let selectedTheme = $derived(themes.find((theme) => theme.id === localThemeId));
  let selectedPalette = $derived(palettes.find((palette) => palette.id === localPaletteId));
  let selectedBackground = $derived(
    ITINERARY_BACKGROUND_PRESETS.find((preset) => preset.url === localBackgroundImage),
  );

  $effect(() => {
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
    localThemeId = selectedThemeId;
    localPaletteId = selectedPaletteId;
    localPackingEnabled = packingEnabled;
  });

  $effect(() => {
    if (show && !wasOpen) {
      localBackgroundImage = currentBackgroundImage ?? "";
      saveError = "";
    }
    wasOpen = show;
  });

  async function handleSave() {
    if (isSaving) return;
    isSaving = true;
    saveError = "";
    try {
      const nextBackground = localBackgroundImage || null;
      if (nextBackground !== currentBackgroundImage) {
        await itineraryApi.update(itineraryId, { background_image: nextBackground });
        await invalidateAll();
      }
      await onThemeChange(localThemeId);
      await onPaletteChange(localPaletteId);
      await onSecretModeChange(localSecretEnabled, localSecretOffset);
      await onPackingEnabledChange(localPackingEnabled);
      onClose();
    } catch (error) {
      console.error("Failed to save itinerary settings:", error);
      saveError = "設定を保存できませんでした。編集モードを確認して、もう一度お試しください。";
    } finally {
      isSaving = false;
    }
  }

  function handleCancel() {
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
    localThemeId = selectedThemeId;
    localPaletteId = selectedPaletteId;
    localBackgroundImage = currentBackgroundImage ?? "";
    localPackingEnabled = packingEnabled;
    saveError = "";
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
        <span class="standard-collapse-icon" class:expanded={showThemeList}>▼</span>
      </div>
      <p class="standard-settings-page-description">
        旅程の見せ方を選択できます。テーマを変えるとビューも切り替わります。
      </p>
      {#if selectedTheme}
        <div class="standard-settings-page-current" aria-label={`現在のデザインテーマ: ${selectedTheme.name}`}>
          <span>現在の設定</span><strong>{selectedTheme.name}</strong>
        </div>
      {/if}
      {#if showThemeList}
        <div class="standard-settings-page-field">
          {#each themes as theme}
            <label class="standard-settings-page-radio">
              <input type="radio" name="theme" value={theme.id} bind:group={localThemeId} />
              <div class="standard-settings-page-radio-content">
                <span class="standard-settings-page-radio-title">{theme.name}</span>
                {#if theme.description}
                  <span class="standard-settings-page-radio-desc">{theme.description}</span>
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
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="standard-settings-page-section-header standard-settings-page-section-header-clickable"
        onclick={() => (showPaletteList = !showPaletteList)}
      >
        <span class="standard-settings-page-section-icon" aria-hidden="true">●</span>
        <h3>しおりの色</h3>
        <span class="standard-collapse-icon" class:expanded={showPaletteList}>▼</span>
      </div>
      <p class="standard-settings-page-description">デザインはそのまま、色合いだけを変更できます。</p>
      {#if selectedPalette}
        <div class="standard-settings-page-current" aria-label={`現在のしおりの色: ${selectedPalette.name}`}>
          <span>現在の設定</span>
          <span class="standard-settings-page-current-palette">
            <i style={`background:${selectedPalette.colors["--theme-primary"]}`}></i>
            <strong>{selectedPalette.name}</strong>
          </span>
        </div>
      {/if}
      {#if showPaletteList}
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
      {/if}
    </div>

    <div class="standard-settings-page-divider"></div>

    <div class="standard-settings-page-section">
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="standard-settings-page-section-header standard-settings-page-section-header-clickable"
        onclick={() => (showBackgroundList = !showBackgroundList)}
      >
        <span class="standard-settings-page-section-icon" aria-hidden="true">▧</span>
        <h3>背景画像</h3>
        <span class="standard-collapse-icon" class:expanded={showBackgroundList}>▼</span>
      </div>
      <p class="standard-settings-page-description">
        タイトル部分のカバー画像を選べます。トップ画面の春夏秋冬の画像も利用できます。
      </p>
      <div class="standard-settings-page-current" aria-label={`現在の背景画像: ${selectedBackground?.name ?? "背景なし"}`}>
        <span>現在の設定</span><strong>{selectedBackground?.name ?? "背景なし"}</strong>
      </div>
      {#if showBackgroundList}
        <div class="standard-background-grid standard-settings-page-field">
          <label class="standard-background-option">
            <input type="radio" name="background-image" value="" bind:group={localBackgroundImage} />
            <span class="standard-background-preview standard-background-preview-none">背景なし</span>
            <strong>背景なし</strong>
          </label>
          {#each ITINERARY_BACKGROUND_PRESETS as preset}
            <label class="standard-background-option">
              <input type="radio" name="background-image" value={preset.url} bind:group={localBackgroundImage} />
              <img class="standard-background-preview" src={preset.url} alt="" loading="lazy" />
              <strong>{preset.name}</strong>
            </label>
          {/each}
        </div>
      {/if}
      <p class="standard-settings-page-hint">将来、写真アップロードを追加しても同じ背景設定を利用できる保存形式です。</p>
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
        <span class="standard-settings-page-toggle-label">シークレットモードを有効にする</span>
        <input type="checkbox" bind:checked={localSecretEnabled} class="standard-toggle-input" />
        <span class="standard-toggle-slider"></span>
      </label>

      {#if localSecretEnabled}
        <div class="standard-settings-page-field">
          <label for="secret-offset-select" class="standard-settings-page-label">予定の表示開始時刻</label>
          <select id="secret-offset-select" bind:value={localSecretOffset} class="standard-settings-page-select">
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

    {#if saveError}
      <p class="standard-settings-page-error" role="alert">{saveError}</p>
    {/if}

    <div class="standard-settings-page-actions">
      <button onclick={handleCancel} class="standard-btn standard-btn-secondary" disabled={isSaving}>キャンセル</button>
      <button onclick={handleSave} class="standard-btn standard-btn-primary" disabled={isSaving}>{isSaving ? "保存中…" : "保存"}</button>
    </div>
    </div>
  </section>
{/if}