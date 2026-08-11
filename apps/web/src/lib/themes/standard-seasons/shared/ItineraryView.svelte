<script lang="ts">
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import {
    createTimestamp,
    createEndTimestamp,
    STEP_TYPE,
  } from "@tabitabi/types";
  import type { StepType } from "@tabitabi/types";
  import { getAvailableThemes } from "$lib/themes";
  import { auth } from "$lib/auth";
  import { authApi } from "$lib/api/auth";
  import { handlePasswordAuth } from "$lib/auth/handle-password-auth";
  import { getIsDemoMode } from "$lib/demo";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { userAuth } from "$lib/user-auth";
  import StepList from "./StepList.svelte";
  import EventDetailDialog from "./components/EventDetailDialog.svelte";
  import BottomNav from "./components/BottomNav.svelte";
  import FloatingActions from "./components/FloatingActions.svelte";
  import MemoDialog from "./components/MemoDialog.svelte";
  import PasswordDialog from "./components/PasswordDialog.svelte";
  import ShareDialog from "./components/ShareDialog.svelte";
  import PublishDialog from "./components/PublishDialog.svelte";
  import MoreMenu from "./components/MoreMenu.svelte";
  import MoneyOverlay from "./components/MoneyOverlay.svelte";
  import PackingOverlay from "./components/PackingOverlay.svelte";
  import ViewModeSelector from "./components/ViewModeSelector.svelte";
  import SettingsDialog from "./components/SettingsDialog.svelte";
  import { renderMarkdown } from "./utils/markdown";
  import { DEFAULT_VIEW_MODE, isValidViewMode, type ViewMode } from "./utils/storage";
  import { parseMemoData } from "$lib/memo";
  import { openPrintStudio } from "$lib/print";

  interface Props {
    itinerary: ItineraryResponse;
    steps: Step[];
    onUpdateItinerary?: (data: {
      title?: string;
      theme_id?: string;
      default_view_mode?: import("@tabitabi/types").ItineraryViewMode;
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
    onReorderSteps?: (...args: unknown[]) => Promise<void> | void;
    onPublishItinerary?: (metadata?: {
      prefectureSlugs: string[];
      areas: string[];
      tags: string[];
    }) => Promise<string>;
  }

  let {
    itinerary,
    steps,
    onUpdateItinerary,
    onCreateStep,
    onUpdateStep,
    onDeleteStep,
    onReorderSteps: _onReorderSteps,
    onPublishItinerary,
  }: Props = $props();

  const themes = getAvailableThemes();

  let isEditingTitle = $state(false);
  let editedTitle = $state(itinerary.title);
  let isCreatingStep = $state(false);
  let createStepTemplate = $state<Step | null>(null);
  let showCopyMessage = $state(false);
  let showShareDialog = $state(false);
  let showPublishDialog = $state(false);
  let loggedInForPublish = $state(false);
  let showMoreMenu = $state(false);
  let hasEditPermission = $state(false);
  let showPasswordDialog = $state(false);
  let showMemoDialog = $state(false);
  let showSettingsDialog = $state(false);
  let isAuthenticating = $state(false);
  let isSharedSnapshot = $derived(!!itinerary.source_itinerary_id);

  let selectedThemeId = $state(itinerary.theme_id || "standard-autumn");
  let secretModeEnabled = $state(itinerary.secret_settings?.enabled ?? false);
  let secretModeOffset = $state(
    itinerary.secret_settings?.offset_minutes ?? 60,
  );
  let showMoney = $state(false);
  let showPacking = $state(false);
  let showViewModeSelector = $state(false);
  let currentViewMode = $state<ViewMode>(DEFAULT_VIEW_MODE);
  let defaultViewMode = $state<ViewMode>(
    itinerary.default_view_mode && isValidViewMode(itinerary.default_view_mode)
      ? itinerary.default_view_mode
      : DEFAULT_VIEW_MODE,
  );
  let publicNotice = $derived(
    typeof parseMemoData(itinerary.memo).affiliate_disclosure === "string"
      ? (parseMemoData(itinerary.memo).affiliate_disclosure as string)
      : "",
  );

  let focusedDate = $state<string | null>(null);
  let stepListRef: any = undefined;

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
    currentViewMode = defaultViewMode;

    if (getIsDemoMode()) {
      hasEditPermission = true;
      return;
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

    if (onPublishItinerary && new URLSearchParams(window.location.search).get("publish") === "1") {
      loggedInForPublish = userAuth.isLoggedIn();
      showPublishDialog = true;
      window.history.replaceState({}, "", window.location.pathname);
    }
  });

  function handleViewModeChange(mode: ViewMode) {
    if (mode === "printPreview") return;
    currentViewMode = mode;
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

  function openPublishDialog() {
    loggedInForPublish = userAuth.isLoggedIn();
    showPublishDialog = true;
  }

  function goToPublishLogin() {
    sessionStorage.setItem("tabitabi_pending_publish", itinerary.id);
    void goto("/profile");
  }

  async function publishToExplore(metadata: {
    prefectureSlugs: string[];
    areas: string[];
    tags: string[];
  }) {
    if (!onPublishItinerary) throw new Error("PUBLISH_UNAVAILABLE");
    return onPublishItinerary(metadata);
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

  async function handleDefaultViewModeUpdate(mode: ViewMode) {
    if (mode === "printPreview" || mode === defaultViewMode) return;
    defaultViewMode = mode;
    currentViewMode = mode;
    if (onUpdateItinerary) {
      await onUpdateItinerary({ default_view_mode: mode });
    }
  }

</script>

<div
  class="standard-theme"
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
        </div>
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
        onViewModeClick={() => (showViewModeSelector = true)}
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
    canEdit={hasEditPermission}
    {steps}
    onClose={() => (showMoney = false)}
  />

  <PackingOverlay
    show={showPacking}
    itineraryId={itinerary.id}
    canEdit={hasEditPermission}
    onClose={() => (showPacking = false)}
  />

  <ShareDialog
    show={showShareDialog}
    {hasEditPermission}
    onCopyLink={copyShareLink}
    onClose={() => (showShareDialog = false)}
  />

  <PublishDialog
    show={showPublishDialog}
    isLoggedIn={loggedInForPublish}
    sourceText={`${itinerary.title} ${steps.map((step) => step.location ?? "").join(" ")}`}
    onLogin={goToPublishLogin}
    onPublish={publishToExplore}
    onClose={() => (showPublishDialog = false)}
  />

  <MoreMenu
    show={showMoreMenu}
    canConfigure={hasEditPermission}
    canRequestEdit={!isSharedSnapshot}
    canPublish={hasEditPermission && !!onPublishItinerary && !isSharedSnapshot}
    {hasEditPermission}
    onShare={() => {
      if (hasEditPermission) showShareDialog = true;
      else void copyViewOnlyLink();
    }}
    onPrint={openPrintPreview}
    onPublish={openPublishDialog}
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

  {#if showViewModeSelector}
    <ViewModeSelector
      currentMode={currentViewMode}
      onModeChange={handleViewModeChange}
      onClose={() => (showViewModeSelector = false)}
    />
  {/if}

  <SettingsDialog
    show={showSettingsDialog}
    itineraryId={itinerary.id}
    {themes}
    {selectedThemeId}
    defaultViewMode={defaultViewMode}
    {secretModeEnabled}
    {secretModeOffset}
    onThemeChange={handleThemeChange}
    onDefaultViewModeChange={handleDefaultViewModeUpdate}
    onSecretModeChange={handleSecretModeUpdate}
    onClose={() => (showSettingsDialog = false)}
  />

  <FloatingActions {hasEditPermission} onAddStep={openAddStepForm} />
</div>
