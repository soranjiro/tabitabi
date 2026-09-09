<script lang="ts">
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import {
    createTimestamp,
    createEndTimestamp,
    getStepDate,
    STEP_TYPE,
  } from "@tabitabi/types";
  import type { StepType } from "@tabitabi/types";
  import { getAvailablePalettes, getAvailableThemes, getPalette, getThemePreset } from "$lib/themes";
  import { auth } from "$lib/auth";
  import { authApi } from "$lib/api/auth";
  import { handlePasswordAuth } from "$lib/auth/handle-password-auth";
  import { getIsDemoMode } from "$lib/demo";
  import { onMount, setContext } from "svelte";
  import StepList from "./StepList.svelte";
  import EventDetailDialog from "./components/EventDetailDialog.svelte";
  import BottomNav from "./components/BottomNav.svelte";
  import FloatingActions from "./components/FloatingActions.svelte";
  import MemoDialog from "./components/MemoDialog.svelte";
  import PasswordDialog from "./components/PasswordDialog.svelte";
  import ShareDialog from "./components/ShareDialog.svelte";
  import MoreMenu from "./components/MoreMenu.svelte";
  import MoneyOverlay from "$lib/features/money/MoneyOverlay.svelte";
  import { MONEY_NAVIGATION_CONTEXT, type MoneyNavigationContext } from "$lib/features/money/navigation";
  import PackingOverlay from "$lib/features/packing/PackingOverlay.svelte";
  import SettingsDialog from "./components/SettingsDialog.svelte";
  import ItineraryOnboardingPopups from "$lib/features/itinerary-onboarding/ItineraryOnboardingPopups.svelte";
  import { itineraryCreationPopups } from "$lib/features/itinerary-onboarding/config";
  import { renderMarkdown } from "./utils/markdown";
  import { type ViewMode } from "./utils/storage";
  import { parseMemoData } from "$lib/memo";
  import { openPrintStudio } from "$lib/print";

  interface Props {
    itinerary: ItineraryResponse;
    steps: Step[];
    onUpdateItinerary?: (data: {
      title?: string;
      theme_id?: string;
      palette_id?: string;
      packing_enabled?: boolean;
      prefecture_slugs?: string[];
      areas?: string[];
      tags?: string[];
      metadata_initialized?: boolean;
      memo?: string;
      secret_settings?: {
        enabled: boolean;
        offset_minutes: number;
      } | null;
    }) => Promise<void>;
    onCreateStep?: (data: {
      title: string;
      // Unix ms
      start_at: number;
      end_at: number;
      location?: string;
      notes?: string;
      link?: string | null;
      type?: StepType;
      is_all_day?: boolean;
    }) => Promise<void>;
    onUpdateStep?: (
      stepId: string,
      data: {
        title?: string;
        start_at?: number;
        end_at?: number;
        location?: string;
        notes?: string;
        link?: string | null;
        type?: StepType;
        is_all_day?: boolean;
      },
    ) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
    onBatchUpdateDates?: (updates: import("@tabitabi/types").BatchStepDateUpdate[]) => Promise<void>;
    onReorderSteps?: (...args: unknown[]) => Promise<void> | void;
  }

  let {
    itinerary,
    steps,
    onUpdateItinerary,
    onCreateStep,
    onUpdateStep,
    onDeleteStep,
    onBatchUpdateDates,
    onReorderSteps: _onReorderSteps,
  }: Props = $props();

  const themes = getAvailableThemes();
  const palettes = getAvailablePalettes();

  let isEditingTitle = $state(false);
  let editedTitle = $state(itinerary.title);
  let isCreatingStep = $state(false);
  let createStepTemplate = $state<Step | null>(null);
  let showCopyMessage = $state(false);
  let showShareDialog = $state(false);
  let showMoreMenu = $state(false);
  let hasEditPermission = $state(false);
  let showPasswordDialog = $state(false);
  let showMemoDialog = $state(false);
  let showSettingsDialog = $state(false);
  let showMetadataDialog = $state(false);
  let isAuthenticating = $state(false);
  let isSharedSnapshot = $derived(!!itinerary.source_itinerary_id);
  let bulkDateOpen = $state(false);

  let selectedThemeId = $state(itinerary.theme_id || "standard-accordion");
  let selectedPaletteId = $state(itinerary.palette_id || getThemePreset(selectedThemeId).defaultPaletteId);
  let secretModeEnabled = $state(itinerary.secret_settings?.enabled ?? false);
  let secretModeOffset = $state(
    itinerary.secret_settings?.offset_minutes ?? 60,
  );
  let showMoney = $state(false);
  let requestedMoneyItemId = $state<string | null>(null);
  let stepOpenedFromMoney = $state<Step | null>(null);
  let showPacking = $state(false);
  let packingEnabled = $state(itinerary.packing_enabled ?? true);
  let prefectureSlugs = $state([...(itinerary.prefecture_slugs ?? [])]);
  let itineraryAreas = $state([...(itinerary.areas ?? [])]);
  let itineraryTags = $state([...(itinerary.tags ?? [])]);
  let currentViewMode = $derived(getThemePreset(selectedThemeId).viewMode as ViewMode);
  let paletteStyle = $derived(Object.entries(getPalette(selectedPaletteId).colors).map(([key, value]) => `${key}:${value}`).join(";"));
  let publicNotice = $derived(
    typeof parseMemoData(itinerary.memo).affiliate_disclosure === "string"
      ? (parseMemoData(itinerary.memo).affiliate_disclosure as string)
      : "",
  );

  let focusedDate = $state<string | null>(null);
  let stepListRef: any = undefined;

  const datedGroups = $derived.by(() => {
    const groups = new Map<string, Step[]>();
    for (const step of steps) {
      const date = getStepDate(step);
      groups.set(date, [...(groups.get(date) ?? []), step]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  });

  async function moveDateGroup(sourceDate: string, targetDate: string) {
    if (!targetDate || targetDate === sourceDate || !onBatchUpdateDates) return;
    const group = datedGroups.find(([date]) => date === sourceDate)?.[1] ?? [];
    await onBatchUpdateDates(group.map((step) => {
      const start = new Date(step.start_at);
      const target = new Date(`${targetDate}T00:00:00`);
      target.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
      const duration = step.end_at - step.start_at;
      return { id: step.id, start_at: target.getTime(), end_at: target.getTime() + duration };
    }));
  }

  function openMoneyItem(itemId: string) {
    stepOpenedFromMoney = null;
    requestedMoneyItemId = itemId;
    showMoney = true;
  }

  function openStepFromMoney(step: Step) {
    showMoney = false;
    requestedMoneyItemId = null;
    stepOpenedFromMoney = step;
  }

  setContext<MoneyNavigationContext>(MONEY_NAVIGATION_CONTEXT, { openMoneyItem });

  function getCreateStepTemplate(): Step {
    const startDate = focusedDate
      ? new Date(`${focusedDate}T09:00:00`)
      : new Date();
    startDate.setSeconds(0, 0);
    const startAt = startDate.getTime();
    const endAt = startAt + 60 * 60 * 1000;

    return {
      id: "",
      itinerary_id: itinerary.id,
      title: "",
      start_at: startAt,
      end_at: endAt,
      location: "",
      notes: "",
      link: null,
      type: STEP_TYPE.NORMAL_GENERAL,
      is_all_day: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  function openAddStepForm() {
    isCreatingStep = true;
    createStepTemplate = getCreateStepTemplate();
  }

  onMount(() => {
    const openFeatureFromHash = () => {
      showMoney = window.location.hash === '#money';
      showPacking = window.location.hash === '#packing';
    };
    openFeatureFromHash();
    window.addEventListener('hashchange', openFeatureFromHash);
    if (getIsDemoMode() || isSharedSnapshot) {
      hasEditPermission = true;
      return () => window.removeEventListener('hashchange', openFeatureFromHash);
    }

    const token = auth.extractTokenFromUrl();
    if (token && itinerary.is_password_protected) {
      auth.setToken(itinerary.id, itinerary.title, token);
    }
    hasEditPermission = !isSharedSnapshot && auth.hasEditPermission(itinerary.id);

    if (!hasEditPermission && !itinerary.is_password_protected && !itinerary.source_itinerary_id) {
      hasEditPermission = true;
    }

    if (hasEditPermission) {
      auth.updateAccessTime(itinerary.id, itinerary.title);
    }

    const metadataRequested = new URLSearchParams(window.location.search).get("metadata") === "1";
    const shouldShowMetadataOnboarding = itineraryCreationPopups.metadata.enabled && !itinerary.metadata_initialized;
    if (hasEditPermission && !isSharedSnapshot && (metadataRequested || shouldShowMetadataOnboarding)) {
      showMetadataDialog = true;
      if (metadataRequested) window.history.replaceState({}, "", window.location.pathname);
    }
    return () => window.removeEventListener('hashchange', openFeatureFromHash);
  });

  function closeFeature(feature: 'money' | 'packing') {
    if (window.location.hash === `#${feature}`) window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    if (feature === 'money') { showMoney = false; requestedMoneyItemId = null; }
    else showPacking = false;
  }

  async function onPasswordAuth(password: string) {
    await handlePasswordAuth({
      shioriId: itinerary.id,
      title: itinerary.title,
      password,
      onSuccess: () => {
        hasEditPermission = true;
        showPasswordDialog = false;
      },
      onError: (message) => alert(message),
      setAuthenticating: (value) => (isAuthenticating = value),
    });
  }

  function handleEditModeToggle() {
    if (isSharedSnapshot) return;
    if (hasEditPermission) {
      // Check if currently editing
      if (stepListRef?.isCurrentlyEditing?.()) {
        if (confirm("編集中です。編集を棄却して閲覧モードに変更しますか？")) {
          hasEditPermission = false;
        }
      } else {
        hasEditPermission = false;
      }
    } else {
      if (getIsDemoMode()) {
        hasEditPermission = true;
        return;
      }
      attemptEditModeActivation();
    }
  }

  async function attemptEditModeActivation() {
    if (getIsDemoMode()) {
      hasEditPermission = true;
      return;
    }

    const token = auth.getToken(itinerary.id);

    if (token) {
      const isValid = await authApi.verifyToken(itinerary.id);
      if (isValid) {
        hasEditPermission = true;
        auth.updateAccessTime(itinerary.id, itinerary.title);
        return;
      }
    }

    // パスワード不要かつ共有スナップショットでなければ即許可、必要なら入力ダイアログを開く
    if (!itinerary.is_password_protected && !itinerary.source_itinerary_id) {
      hasEditPermission = true;
      auth.updateAccessTime(itinerary.id, itinerary.title);
    } else {
      showPasswordDialog = true;
    }
  }

  async function handleMemoUpdate(memo: string) {
    if (onUpdateItinerary) {
      await onUpdateItinerary({ memo });
    }
    showMemoDialog = false;
  }

  function openPrintPreview() {
    openPrintStudio();
  }

  async function copyViewOnlyLink() {
    try {
      const url = window.location.origin + window.location.pathname;
      await navigator.clipboard.writeText(url);
      showCopyMessage = true;
      setTimeout(() => {
        showCopyMessage = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  async function copyShareLink(includeToken: boolean) {
    try {
      let url = window.location.origin + window.location.pathname;

      if (includeToken && hasEditPermission) {
        const token = auth.getToken(itinerary.id);
        if (token) {
          url += `?token=${token}`;
        }
      }

      await navigator.clipboard.writeText(url);
      showShareDialog = false;
      showCopyMessage = true;
      setTimeout(() => {
        showCopyMessage = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  async function saveMetadata(metadata: { prefectureSlugs: string[]; areas: string[]; tags: string[] }) {
    prefectureSlugs = metadata.prefectureSlugs;
    itineraryAreas = metadata.areas;
    itineraryTags = metadata.tags;
    if (onUpdateItinerary) {
      await onUpdateItinerary({
        prefecture_slugs: metadata.prefectureSlugs,
        areas: metadata.areas,
        tags: metadata.tags,
        metadata_initialized: true,
      });
    }
    showMetadataDialog = false;
  }

  async function dismissMetadata() {
    showMetadataDialog = false;
    if (!itinerary.metadata_initialized && onUpdateItinerary) {
      await onUpdateItinerary({ metadata_initialized: true });
    }
  }

  async function handleTitleUpdate() {
    if (!editedTitle.trim() || editedTitle === itinerary.title) {
      isEditingTitle = false;
      editedTitle = itinerary.title;
      return;
    }
    if (onUpdateItinerary) {
      await onUpdateItinerary({ title: editedTitle.trim() });
    }
    isEditingTitle = false;
  }

  async function handleCreateStep(data: {
    title: string;
    start_at: number;
    end_at: number;
    location?: string;
    notes?: string;
    type?: StepType;
    is_all_day?: boolean;
  }) {
    if (!onCreateStep) return;
    await onCreateStep(data);
    isCreatingStep = false;
    createStepTemplate = null;
  }

  function cancelAddStep() {
    isCreatingStep = false;
    createStepTemplate = null;
  }

  async function handleThemeChange(themeId: string) {
    if (themeId === itinerary.theme_id) {
      return;
    }
    selectedThemeId = themeId;
    if (onUpdateItinerary) {
      await onUpdateItinerary({ theme_id: themeId });
    }
  }

  async function handlePaletteChange(paletteId: string) {
    if (paletteId === selectedPaletteId) return;
    selectedPaletteId = paletteId;
    if (onUpdateItinerary) await onUpdateItinerary({ palette_id: paletteId });
  }

  async function handleSecretModeUpdate(enabled: boolean, offset: number) {
    secretModeEnabled = enabled;
    secretModeOffset = offset;
    if (onUpdateItinerary) {
      await onUpdateItinerary({
        secret_settings: {
          enabled,
          offset_minutes: offset,
        },
      });
    }
  }

  async function handlePackingEnabledUpdate(enabled: boolean) {
    if (enabled === packingEnabled) return;
    packingEnabled = enabled;
    if (!enabled) showPacking = false;
    if (onUpdateItinerary) await onUpdateItinerary({ packing_enabled: enabled });
  }

</script>

<div
  class="standard-theme"
  style={paletteStyle}
  class:standard-week-mode={currentViewMode === "week"}
  class:standard-spring-theme={selectedThemeId === "standard-spring"}
  class:standard-summer-theme={selectedThemeId === "standard-summer"}
  class:standard-winter-theme={selectedThemeId === "standard-winter"}
>
  <div class="standard-container">
    <header class="standard-header">
      {#if showCopyMessage}
        <div class="standard-copy-msg">コピーしました</div>
      {/if}
      {#if isEditingTitle}
        <input
          type="text"
          bind:value={editedTitle}
          onblur={handleTitleUpdate}
          onkeydown={(e) => e.key === "Enter" && handleTitleUpdate()}
          class="standard-title-input"
        />
      {:else}
        <button
          type="button"
          onclick={() => {
            isEditingTitle = true;
          }}
          class="standard-title-button"
          disabled={!hasEditPermission}>{itinerary.title}</button
        >
      {/if}
      <div class="standard-controls">
        {#if itinerary.memo}
          {#if hasEditPermission}
            <button
              type="button"
              class="standard-memo-display"
              onclick={(e) => {
                if ((e.target as HTMLElement).closest("a")) return;
                showMemoDialog = true;
              }}
            >
              {@html renderMarkdown(itinerary.memo)}
            </button>
          {:else}
            <div class="standard-memo-display">
              {@html renderMarkdown(itinerary.memo)}
            </div>
          {/if}
        {:else if hasEditPermission}
          <button
            onclick={() => {
              showMemoDialog = true;
            }}
            class="standard-btn standard-btn-edit"
          >
            📝 メモを追加
          </button>
        {/if}
      </div>
    </header>

      {#if hasEditPermission}
        <div class="standard-add-step">
          <button
            onclick={openAddStepForm}
            class="standard-btn-add"
            disabled={!hasEditPermission}>＋ 予定を追加</button
          >
          {#if datedGroups.length > 0}<button type="button" class="standard-btn standard-btn-edit" onclick={() => bulkDateOpen = !bulkDateOpen}>日付をまとめて変更</button>{/if}
        </div>
        {#if bulkDateOpen}
          <section class="standard-bulk-date" aria-label="日付をまとめて変更">
            <strong>同じ日に登録された予定をまとめて移動</strong>
            {#each datedGroups as [date, dateSteps]}
              <label>{date}（{dateSteps.length}件）<input type="date" value={date} onchange={(event) => void moveDateGroup(date, (event.currentTarget as HTMLInputElement).value)} /></label>
            {/each}
          </section>
        {/if}
      {/if}

      <StepList
        bind:this={stepListRef}
        {steps}
        {onUpdateStep}
        {onDeleteStep}
        {hasEditPermission}
        {secretModeEnabled}
        {secretModeOffset}
        viewMode={currentViewMode}
        bind:focusedDate
      />

      {#if itinerary.source_itinerary_id && publicNotice}
        <p class="standard-public-disclosure">{publicNotice}</p>
      {/if}
    <BottomNav
        {packingEnabled}
        onMoneyOpen={() => (showMoney = true)}
        onPackingOpen={() => (showPacking = true)}
        onMenuClick={() => (showMoreMenu = true)}
    />
  </div>

  <MemoDialog
    show={showMemoDialog}
    memo={itinerary.memo || ""}
    {hasEditPermission}
    onSave={handleMemoUpdate}
    onClose={() => (showMemoDialog = false)}
  />

  <PasswordDialog
    show={showPasswordDialog}
    {isAuthenticating}
    onAuth={onPasswordAuth}
    onClose={() => (showPasswordDialog = false)}
  />

  <MoneyOverlay
    show={showMoney}
    itineraryId={itinerary.id}
    canEdit={hasEditPermission && !isSharedSnapshot}
    {steps}
    requestedEditItemId={requestedMoneyItemId}
    onEditItemOpened={() => (requestedMoneyItemId = null)}
    onViewStep={openStepFromMoney}
    onClose={() => closeFeature('money')}
  />

  {#if stepOpenedFromMoney}
    <EventDetailDialog
      step={stepOpenedFromMoney}
      {hasEditPermission}
      {secretModeEnabled}
      {secretModeOffset}
      onClose={() => (stepOpenedFromMoney = null)}
      {onUpdateStep}
      {onDeleteStep}
    />
  {/if}

  {#if packingEnabled}
    <PackingOverlay
      show={showPacking}
      itineraryId={itinerary.id}
      canEdit={hasEditPermission && !isSharedSnapshot}
      onClose={() => closeFeature('packing')}
    />
  {/if}

  <ShareDialog
    show={showShareDialog}
    {hasEditPermission}
    onCopyLink={copyShareLink}
    onClose={() => (showShareDialog = false)}
  />

  <MoreMenu
    show={showMoreMenu}
    canConfigure={hasEditPermission}
    canRequestEdit={!isSharedSnapshot}
    {hasEditPermission}
    onShare={() => hasEditPermission && !isSharedSnapshot ? (showShareDialog = true) : void copyViewOnlyLink()}
    onPrint={openPrintPreview}
    onSettings={() => (showSettingsDialog = true)}
    onEditModeToggle={handleEditModeToggle}
    onClose={() => (showMoreMenu = false)}
  />

  {#if isCreatingStep && createStepTemplate}
    <EventDetailDialog
      step={createStepTemplate}
      mode="create"
      {hasEditPermission}
      onCreateStep={handleCreateStep}
      onClose={cancelAddStep}
    />
  {/if}

  <SettingsDialog
    show={showSettingsDialog}
    itineraryId={itinerary.id}
    {themes}
    {palettes}
    {selectedThemeId}
    {selectedPaletteId}
    {secretModeEnabled}
    {secretModeOffset}
    {packingEnabled}
    onThemeChange={handleThemeChange}
    onPaletteChange={handlePaletteChange}
    onSecretModeChange={handleSecretModeUpdate}
    onPackingEnabledChange={handlePackingEnabledUpdate}
    onEditMetadata={() => (showMetadataDialog = true)}
    onClose={() => (showSettingsDialog = false)}
  />

  <ItineraryOnboardingPopups
    showMetadata={showMetadataDialog}
    {prefectureSlugs}
    areas={itineraryAreas}
    tags={itineraryTags}
    onSaveMetadata={saveMetadata}
    onCloseMetadata={dismissMetadata}
  />

  <FloatingActions {hasEditPermission} onAddStep={openAddStepForm} />
</div>
