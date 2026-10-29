<script lang="ts">
  import { ITINERARY_BACKGROUND_PRESETS } from "$lib/itinerary-backgrounds";
  import { prefectures } from "$lib/explore/data";
  import ItineraryMetadataFields from "$lib/features/itinerary-metadata/ItineraryMetadataFields.svelte";
  import { PaletteIcon, SecretIcon } from "./icons/index.svelte";
  import TripMembersEditor from "./TripMembersEditor.svelte";

  interface ThemeOption {
    id: string;
    name: string;
    description?: string;
  }

  interface PaletteOption {
    id: string;
    name: string;
    description?: string;
    colors: Record<string, string>;
  }

  interface MetadataValue {
    prefectureSlugs: string[];
    areas: string[];
    tags: string[];
  }

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
    prefectureSlugs?: string[];
    areas?: string[];
    tags?: string[];
    backgroundImage?: string | null;
    backgroundDisplay?: "cover" | "page";
    onThemeChange: (themeId: string) => void | Promise<void>;
    onPaletteChange: (paletteId: string) => void | Promise<void>;
    onSecretModeChange: (enabled: boolean, offset: number) => void | Promise<void>;
    onPackingEnabledChange: (enabled: boolean) => void | Promise<void>;
    onMetadataChange?: (metadata: MetadataValue) => void | Promise<void>;
    onBackgroundChange: (backgroundImage: string | null, backgroundDisplay: "cover" | "page") => void | Promise<void>;
    onClose: () => void;
  }

  type SettingsPanel = "main" | "metadata" | "theme" | "palette" | "background";

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
    prefectureSlugs = [],
    areas = [],
    tags = [],
    backgroundImage = null,
    backgroundDisplay = "cover",
    onThemeChange,
    onPaletteChange,
    onSecretModeChange,
    onPackingEnabledChange,
    onMetadataChange,
    onBackgroundChange,
    onClose,
  }: Props = $props();

  let localSecretEnabled = $state(secretModeEnabled);
  let localSecretOffset = $state(secretModeOffset);
  let localThemeId = $state(selectedThemeId);
  let localPaletteId = $state(selectedPaletteId);
  let localPackingEnabled = $state(packingEnabled);
  let localPrefectureSlugs = $state<string[]>([]);
  let localAreas = $state<string[]>([]);
  let localTags = $state<string[]>([]);
  let localBackgroundImage = $state("");
  let localBackgroundDisplay = $state<"cover" | "page">("cover");
  let activePanel = $state<SettingsPanel>("main");
  let wasOpen = $state(false);
  let isSaving = $state(false);
  let saveError = $state("");

  let selectedTheme = $derived(themes.find((theme) => theme.id === localThemeId));
  let selectedPalette = $derived(palettes.find((palette) => palette.id === localPaletteId));
  let selectedBackground = $derived(
    ITINERARY_BACKGROUND_PRESETS.find((preset) => preset.url === localBackgroundImage),
  );
  let metadataSummary = $derived(formatMetadataSummary(localPrefectureSlugs, localAreas, localTags));
  let metadataChanged = $derived(
    !sameStrings(localPrefectureSlugs, prefectureSlugs)
      || !sameStrings(localAreas, areas)
      || !sameStrings(localTags, tags),
  );
  let isDirty = $derived(
    localThemeId !== selectedThemeId
      || localPaletteId !== selectedPaletteId
      || localSecretEnabled !== secretModeEnabled
      || localSecretOffset !== secretModeOffset
      || localPackingEnabled !== packingEnabled
      || metadataChanged
      || localBackgroundImage !== (backgroundImage ?? "")
      || localBackgroundDisplay !== backgroundDisplay,
  );

  $effect(() => {
    if (show && !wasOpen) {
      resetDraft();
      activePanel = "main";
      saveError = "";
    }
    wasOpen = show;
  });

  function sameStrings(left: string[], right: string[]) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  function formatMetadataSummary(nextPrefectures: string[], nextAreas: string[], nextTags: string[]) {
    const destinations = nextPrefectures.map(
      (slug) => prefectures.find((prefecture) => prefecture.slug === slug)?.name ?? slug,
    );
    const tagLabels = nextTags.map((tag) => tag.startsWith("#") ? tag : "#" + tag);
    const values = [...destinations, ...nextAreas, ...tagLabels];
    if (!values.length) return "未設定";
    const visible = values.slice(0, 3).join("・");
    return values.length > 3 ? visible + " +" + (values.length - 3) : visible;
  }

  function resetDraft() {
    localSecretEnabled = secretModeEnabled;
    localSecretOffset = secretModeOffset;
    localThemeId = selectedThemeId;
    localPaletteId = selectedPaletteId;
    localPackingEnabled = packingEnabled;
    localPrefectureSlugs = [...prefectureSlugs];
    localAreas = [...areas];
    localTags = [...tags];
    localBackgroundImage = backgroundImage ?? "";
    localBackgroundDisplay = backgroundDisplay;
  }

  async function handleSave() {
    if (isSaving || !isDirty) return;

    const nextThemeId = localThemeId;
    const nextPaletteId = localPaletteId;
    const nextSecretEnabled = localSecretEnabled;
    const nextSecretOffset = localSecretOffset;
    const nextPackingEnabled = localPackingEnabled;
    const nextPrefectureSlugs = [...localPrefectureSlugs];
    const nextAreas = [...localAreas];
    const nextTags = [...localTags];
    const nextBackgroundImage = localBackgroundImage || null;
    const nextBackgroundDisplay = localBackgroundDisplay;

    isSaving = true;
    saveError = "";
    try {
      if (
        onMetadataChange
        && (
          !sameStrings(nextPrefectureSlugs, prefectureSlugs)
          || !sameStrings(nextAreas, areas)
          || !sameStrings(nextTags, tags)
        )
      ) {
        await onMetadataChange({
          prefectureSlugs: nextPrefectureSlugs,
          areas: nextAreas,
          tags: nextTags,
        });
      }

      if (nextBackgroundImage !== backgroundImage || nextBackgroundDisplay !== backgroundDisplay) {
        await onBackgroundChange(nextBackgroundImage, nextBackgroundDisplay);
      }

      if (nextThemeId !== selectedThemeId) await onThemeChange(nextThemeId);
      if (nextPaletteId !== selectedPaletteId) await onPaletteChange(nextPaletteId);
      if (nextSecretEnabled !== secretModeEnabled || nextSecretOffset !== secretModeOffset) {
        await onSecretModeChange(nextSecretEnabled, nextSecretOffset);
      }
      if (nextPackingEnabled !== packingEnabled) await onPackingEnabledChange(nextPackingEnabled);
      activePanel = "main";
      onClose();
    } catch (error) {
      console.error("Failed to save itinerary settings:", error);
      saveError = "設定を保存できませんでした。編集モードを確認して、もう一度お試しください。";
      activePanel = "main";
    } finally {
      isSaving = false;
    }
  }

  function handleCancel() {
    resetDraft();
    activePanel = "main";
    saveError = "";
    onClose();
  }

  function requestClose() {
    if (isSaving) return;
    if (
      isDirty
      && typeof window !== "undefined"
      && !window.confirm("保存していない変更を破棄しますか？")
    ) return;
    handleCancel();
  }

  function returnToOverview() {
    activePanel = "main";
  }
</script>

{#if show}
  <section class="standard-settings-screen" aria-label="しおり設定">
    <header class="standard-settings-screen-header">
      {#if activePanel === "main"}
        <button type="button" class="standard-settings-screen-back" onclick={requestClose}>‹ 戻る</button>
      {:else}
        <button type="button" class="standard-settings-screen-back" onclick={returnToOverview}>‹ 戻る</button>
      {/if}

      <h2>
        {#if activePanel === "main"}
          しおり設定
          {#if isDirty}<span class="standard-settings-unsaved-dot" title="未保存の変更あり"></span>{/if}
        {:else if activePanel === "metadata"}
          旅行先とタグ
        {:else if activePanel === "theme"}
          デザインテーマ
        {:else if activePanel === "palette"}
          しおりの色
        {:else}
          背景画像
        {/if}
      </h2>

      {#if activePanel === "main"}
        <button type="button" class="standard-settings-screen-close" onclick={requestClose} aria-label="閉じる">×</button>
      {:else}
        <span class="standard-settings-header-spacer" aria-hidden="true"></span>
      {/if}
    </header>

    {#if activePanel === "main"}
      <div class="standard-settings-page standard-settings-overview">
        <button
          type="button"
          class="standard-settings-card standard-settings-card-action"
          onclick={() => (activePanel = "metadata")}
          aria-label="旅行先とタグを編集"
        >
          <span class="standard-settings-card-icon" aria-hidden="true">⌖</span>
          <span class="standard-settings-card-body">
            <strong>旅行先とタグ</strong>
            <small>{metadataSummary}</small>
          </span>
          <span class="standard-settings-card-chevron" aria-hidden="true">›</span>
        </button>

        <section class="standard-settings-card standard-settings-members-card">
          <div class="standard-settings-card-heading">
            <span class="standard-settings-card-icon" aria-hidden="true">👥</span>
            <strong>旅行メンバー</strong>
          </div>
          <TripMembersEditor {show} {itineraryId} />
        </section>

        <button
          type="button"
          class="standard-settings-card standard-settings-card-action"
          onclick={() => (activePanel = "theme")}
          aria-label="デザインテーマを編集"
        >
          <span class="standard-settings-card-icon standard-settings-card-svg" aria-hidden="true">{@html PaletteIcon}</span>
          <span class="standard-settings-card-body">
            <strong>デザインテーマ</strong>
            <small>{selectedTheme?.name ?? "未設定"}</small>
          </span>
          <span class="standard-settings-card-chevron" aria-hidden="true">›</span>
        </button>

        <button
          type="button"
          class="standard-settings-card standard-settings-card-action"
          onclick={() => (activePanel = "palette")}
          aria-label="しおりの色を編集"
        >
          <span class="standard-settings-card-icon" aria-hidden="true">
            <i
              class="standard-settings-color-dot"
              style={"background:" + (selectedPalette?.colors["--theme-primary"] ?? "var(--theme-primary)")}
            ></i>
          </span>
          <span class="standard-settings-card-body">
            <strong>しおりの色</strong>
            <small>{selectedPalette?.name ?? "未設定"}</small>
          </span>
          <span class="standard-settings-card-chevron" aria-hidden="true">›</span>
        </button>

        <button
          type="button"
          class="standard-settings-card standard-settings-card-action"
          onclick={() => (activePanel = "background")}
          aria-label="背景画像を編集"
        >
          <span class="standard-settings-card-icon" aria-hidden="true">▧</span>
          <span class="standard-settings-card-body">
            <strong>背景画像</strong>
            <small>
              {#if localBackgroundImage}
                {selectedBackground?.name ?? "背景画像"}・{localBackgroundDisplay === "cover" ? "カバー" : "全体"}
              {:else}
                背景なし
              {/if}
            </small>
          </span>
          {#if localBackgroundImage}
            <img class="standard-settings-background-thumb" src={localBackgroundImage} alt="" />
          {/if}
          <span class="standard-settings-card-chevron" aria-hidden="true">›</span>
        </button>

        <section class="standard-settings-card standard-settings-switch-card">
          <div class="standard-settings-switch-row">
            <span class="standard-settings-card-icon" aria-hidden="true">▣</span>
            <span class="standard-settings-card-body">
              <strong>持ち物管理</strong>
              <small>{localPackingEnabled ? "使用する" : "使用しない"}</small>
            </span>
            <label class="standard-settings-compact-toggle" aria-label="持ち物管理を使う">
              <input type="checkbox" bind:checked={localPackingEnabled} class="standard-toggle-input" />
              <span class="standard-toggle-slider"></span>
            </label>
          </div>
        </section>

        <section class="standard-settings-card standard-settings-switch-card">
          <div class="standard-settings-switch-row">
            <span class="standard-settings-card-icon standard-settings-card-svg" aria-hidden="true">{@html SecretIcon}</span>
            <span class="standard-settings-card-body">
              <strong>シークレットモード</strong>
              <small>{localSecretEnabled ? "有効" : "無効"}</small>
            </span>
            <label class="standard-settings-compact-toggle" aria-label="シークレットモードを有効にする">
              <input type="checkbox" bind:checked={localSecretEnabled} class="standard-toggle-input" />
              <span class="standard-toggle-slider"></span>
            </label>
          </div>
          {#if localSecretEnabled}
            <select
              id="secret-offset-select"
              aria-label="予定の表示開始時刻"
              bind:value={localSecretOffset}
              class="standard-settings-page-select standard-settings-compact-select"
            >
              <option value={0}>予定時刻に表示</option>
              <option value={15}>15分前から表示</option>
              <option value={30}>30分前から表示</option>
              <option value={60}>1時間前から表示</option>
              <option value={120}>2時間前から表示</option>
              <option value={180}>3時間前から表示</option>
              <option value={300}>5時間前から表示</option>
              <option value={720}>12時間前から表示</option>
              <option value={1440}>24時間前から表示</option>
            </select>
          {/if}
        </section>

        {#if saveError}
          <p class="standard-settings-page-error" role="alert">{saveError}</p>
        {/if}
      </div>

      <div class="standard-settings-savebar" aria-label="設定の保存">
        <button type="button" onclick={requestClose} class="standard-btn standard-btn-secondary" disabled={isSaving}>
          キャンセル
        </button>
        <button
          type="button"
          onclick={handleSave}
          class="standard-btn standard-btn-primary"
          class:standard-settings-save-active={isDirty}
          disabled={isSaving || !isDirty}
        >
          {isSaving ? "保存中…" : "保存"}
        </button>
      </div>
    {:else if activePanel === "metadata"}
      <div class="standard-settings-page standard-settings-subpage">
        <ItineraryMetadataFields
          bind:selectedPrefectures={localPrefectureSlugs}
          bind:areas={localAreas}
          bind:tags={localTags}
        />
        <div class="standard-settings-subpage-actions">
          <button type="button" class="standard-btn standard-btn-primary" onclick={returnToOverview}>決定</button>
        </div>
      </div>
    {:else if activePanel === "theme"}
      <div class="standard-settings-page standard-settings-subpage">
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
        <div class="standard-settings-subpage-actions">
          <button type="button" class="standard-btn standard-btn-primary" onclick={returnToOverview}>決定</button>
        </div>
      </div>
    {:else if activePanel === "palette"}
      <div class="standard-settings-page standard-settings-subpage">
        <div class="standard-settings-page-field">
          {#each palettes as palette}
            <label class="standard-settings-page-radio">
              <input type="radio" name="palette" value={palette.id} bind:group={localPaletteId} />
              <span
                class="standard-settings-palette-preview"
                style={"background:" + palette.colors["--theme-primary"] + ";box-shadow:inset 0 0 0 6px " + palette.colors["--theme-bg"]}
              ></span>
              <div class="standard-settings-page-radio-content">
                <span class="standard-settings-page-radio-title">{palette.name}</span>
                {#if palette.description}
                  <span class="standard-settings-page-radio-desc">{palette.description}</span>
                {/if}
              </div>
              <div class="standard-settings-page-radio-check"></div>
            </label>
          {/each}
        </div>
        <div class="standard-settings-subpage-actions">
          <button type="button" class="standard-btn standard-btn-primary" onclick={returnToOverview}>決定</button>
        </div>
      </div>
    {:else}
      <div class="standard-settings-page standard-settings-subpage">
        <h3 class="standard-background-picker-title">背景画像を選ぶ</h3>
        <div class="standard-background-grid">
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

        <h3 class="standard-background-picker-title">表示する場所</h3>
        <div class="standard-background-display-options">
          <label class="standard-settings-page-radio">
            <input
              type="radio"
              name="background-display"
              value="cover"
              bind:group={localBackgroundDisplay}
              disabled={!localBackgroundImage}
            />
            <div class="standard-settings-page-radio-content">
              <span class="standard-settings-page-radio-title">タイトル部分のカバー</span>
              <span class="standard-settings-page-radio-desc">タイトル部分に表示</span>
            </div>
            <div class="standard-settings-page-radio-check"></div>
          </label>
          <label class="standard-settings-page-radio">
            <input
              type="radio"
              name="background-display"
              value="page"
              bind:group={localBackgroundDisplay}
              disabled={!localBackgroundImage}
            />
            <div class="standard-settings-page-radio-content">
              <span class="standard-settings-page-radio-title">しおり全体の背景</span>
              <span class="standard-settings-page-radio-desc">本文の後ろに表示</span>
            </div>
            <div class="standard-settings-page-radio-check"></div>
          </label>
        </div>

        <div class="standard-settings-subpage-actions">
          <button type="button" class="standard-btn standard-btn-primary" onclick={returnToOverview}>決定</button>
        </div>
      </div>
    {/if}
  </section>
{/if}
