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
  import StepList from "./StepList.svelte";
  import AddStepForm from "./components/AddStepForm.svelte";
  import BottomNav from "./components/BottomNav.svelte";
  import FloatingActions from "./components/FloatingActions.svelte";
  import MemoDialog from "./components/MemoDialog.svelte";
  import PasswordDialog from "./components/PasswordDialog.svelte";
  import ShareDialog from "./components/ShareDialog.svelte";
  import WalicaOverlay from "./components/WalicaOverlay.svelte";
  import ViewModeSelector from "./components/ViewModeSelector.svelte";
  import ThemeSelectorPopup from "./components/ThemeSelectorPopup.svelte";
  import SettingsDialog from "./components/SettingsDialog.svelte";
  import { LinkIcon } from "./components/icons/index.svelte";
  import { renderMarkdown } from "./utils/markdown";
  import { getViewMode, setViewMode, type ViewMode } from "./utils/storage";

  interface Props {
    itinerary: ItineraryResponse;
    steps: Step[];
    onUpdateItinerary?: (data: {
      title?: string;
      theme_id?: string;
      memo?: string;
      walica_id?: string | null;
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
      type?: StepType;
    }) => Promise<void>;
    onUpdateStep?: (
      stepId: string,
      data: {
        title?: string;
        start_at?: number;
        end_at?: number;
        location?: string;
        notes?: string;
        type?: StepType;
      },
    ) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
  }

  let {
    itinerary,
    steps,
    onUpdateItinerary,
    onCreateStep,
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();

  const themes = getAvailableThemes();

  let isEditingTitle = $state(false);
  let editedTitle = $state(itinerary.title);
  let isAddingStep = $state(false);
  let showCopyMessage = $state(false);
  let showShareDialog = $state(false);
  let showShareMenu = $state(false);
  let hasEditPermission = $state(false);
  let showPasswordDialog = $state(false);
  let showMemoDialog = $state(false);
  let showSettingsDialog = $state(false);
  let isAuthenticating = $state(false);

  let selectedThemeId = $state(itinerary.theme_id || "standard-autumn");
  let secretModeEnabled = $state(itinerary.secret_settings?.enabled ?? false);
  let secretModeOffset = $state(
    itinerary.secret_settings?.offset_minutes ?? 60,
  );
  let walicaUrl = $state(
    itinerary.walica_id ? `https://walica.jp/group/${itinerary.walica_id}` : "",
  );
  let showWalica = $state(false);
  let showViewModeSelector = $state(false);
  let showThemeSelectorPopup = $state(false);
  let currentViewMode = $state<ViewMode>("dayCard");

  let newStep = $state({
    title: "",
    date: "",
    time: "",
    location: "",
    notes: "",
    type: STEP_TYPE.NORMAL_GENERAL as StepType,
  });
  let newStepHour = $state("09");
  let newStepMinute = $state("00");
  let focusedDate = $state<string | null>(null);
  let stepListRef: any = undefined;

  function openAddStepForm() {
    isAddingStep = true;
    if (focusedDate) {
      newStep.date = focusedDate;
    } else {
      newStep.date = "";
    }
  }

  onMount(() => {
    currentViewMode = getViewMode(itinerary.id);

    if (getIsDemoMode()) {
      hasEditPermission = true;
      return;
    }

    const token = auth.extractTokenFromUrl();
    if (token && itinerary.is_password_protected) {
      auth.setToken(itinerary.id, itinerary.title, token);
    }
    hasEditPermission = auth.hasEditPermission(itinerary.id);

    if (!hasEditPermission && !itinerary.is_password_protected) {
      hasEditPermission = true;
    }

    if (hasEditPermission) {
      auth.updateAccessTime(itinerary.id, itinerary.title);
    }
  });

  function handleViewModeChange(mode: ViewMode) {
    currentViewMode = mode;
    setViewMode(itinerary.id, mode);
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

    // パスワード不要なら即許可、必要なら入力ダイアログを開く
    if (!itinerary.is_password_protected) {
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

  function handleShare() {
    showShareMenu = !showShareMenu;
  }

  function handlePrint() {
    showShareMenu = false;
    window.print();
  }

  async function copyViewOnlyLink() {
    try {
      const url = window.location.origin + window.location.pathname;
      await navigator.clipboard.writeText(url);
      showShareMenu = false;
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
      showShareMenu = false;
      showCopyMessage = true;
      setTimeout(() => {
        showCopyMessage = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
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

  async function handleAddStep(payload?: {
    start_at?: number;
    end_at?: number;
    type?: StepType;
  }) {
    if (!newStep.title.trim()) {
      alert("タイトル、日付は必須です");
      return;
    }

    let startAt: number | undefined = undefined;
    let endAt: number | undefined = undefined;

    if (payload && payload.start_at) {
      startAt = payload.start_at;
      endAt = payload.end_at ?? createEndTimestamp(startAt, 60);
    } else {
      if (!newStep.date || !newStep.time) {
        alert("日時の指定が正しくありません");
        return;
      }
      startAt = createTimestamp(newStep.date, newStep.time);
      endAt = createEndTimestamp(startAt, 60);
    }

    if (endAt <= startAt) {
      alert("終了時刻は開始時刻より後にしてください");
      return;
    }

    if (onCreateStep && startAt) {
      await onCreateStep({
        title: newStep.title.trim(),
        start_at: startAt,
        end_at: endAt,
        location: newStep.location.trim() || undefined,
        notes: newStep.notes.trim() || undefined,
        type: payload?.type ?? newStep.type,
      });

      newStep = {
        title: "",
        date: "",
        time: "",
        location: "",
        notes: "",
        type: STEP_TYPE.NORMAL_GENERAL,
      };
      newStepHour = "09";
      newStepMinute = "00";
      isAddingStep = false;
    }
  }

  function cancelAddStep() {
    newStep = {
      title: "",
      date: "",
      time: "",
      location: "",
      notes: "",
      type: STEP_TYPE.NORMAL_GENERAL,
    };
    newStepHour = "09";
    newStepMinute = "00";
    isAddingStep = false;
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

  async function handleWalicaUpdate(url: string) {
    if (url && !url.startsWith("https://walica.jp/group/")) {
      alert("WalicaのURLは https://walica.jp/group/ で始まる必要があります");
      return;
    }
    walicaUrl = url;
    const walicaId = url ? url.split("/group/")[1] : null;
    if (onUpdateItinerary) {
      await onUpdateItinerary({ walica_id: walicaId });
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
      <div class="standard-share-wrapper">
        <button
          type="button"
          class="standard-share-icon"
          onclick={handleShare}
          aria-label="共有メニュー"
          title="共有メニュー"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="24"
            height="24"
          >
            <path
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
            />
          </svg>
        </button>
        {#if showShareMenu}
          <div class="standard-share-menu">
            <button
              type="button"
              class="standard-share-menu-item"
              onclick={hasEditPermission
                ? () => (showShareDialog = true)
                : copyViewOnlyLink}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                />
              </svg>
              リンクをコピー
            </button>
            <button
              type="button"
              class="standard-share-menu-item"
              onclick={handlePrint}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path
                  d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"
                />
              </svg>
              印刷・PDF出力
            </button>
          </div>
        {/if}
      </div>
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
        {#if isAddingStep}
          <AddStepForm
            bind:newStep
            bind:newStepHour
            bind:newStepMinute
            onSubmit={handleAddStep}
            onCancel={cancelAddStep}
          />
        {:else}
          <button
            onclick={openAddStepForm}
            class="standard-btn-add"
            disabled={!hasEditPermission}>＋ 予定を追加</button
          >
        {/if}
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

    <BottomNav
      {hasEditPermission}
      walicaId={itinerary.walica_id}
      {themes}
      {selectedThemeId}
      {secretModeEnabled}
      {secretModeOffset}
      {walicaUrl}
      onEditModeToggle={handleEditModeToggle}
      onViewModeClick={() => (showViewModeSelector = true)}
      onThemeChange={handleThemeChange}
      onSecretModeChange={handleSecretModeUpdate}
      onWalicaUpdate={handleWalicaUpdate}
      onWalicaOpen={() => (showWalica = true)}
      onShowThemeSelector={() => (showThemeSelectorPopup = true)}
      onSettingsClick={() => (showSettingsDialog = true)}
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

  <WalicaOverlay
    show={showWalica}
    walicaId={itinerary.walica_id || ""}
    onClose={() => (showWalica = false)}
  />

  <ShareDialog
    show={showShareDialog}
    {hasEditPermission}
    onCopyLink={copyShareLink}
    onClose={() => (showShareDialog = false)}
  />

  {#if showViewModeSelector}
    <ViewModeSelector
      currentMode={currentViewMode}
      onModeChange={handleViewModeChange}
      onClose={() => (showViewModeSelector = false)}
    />
  {/if}

  <ThemeSelectorPopup
    open={showThemeSelectorPopup}
    {themes}
    {selectedThemeId}
    onThemeChange={handleThemeChange}
    onClose={() => (showThemeSelectorPopup = false)}
  />

  <SettingsDialog
    show={showSettingsDialog}
    {themes}
    {selectedThemeId}
    {secretModeEnabled}
    {secretModeOffset}
    {walicaUrl}
    onThemeChange={handleThemeChange}
    onSecretModeChange={handleSecretModeUpdate}
    onWalicaUpdate={handleWalicaUpdate}
    onClose={() => (showSettingsDialog = false)}
  />

  <FloatingActions {hasEditPermission} onAddStep={openAddStepForm} />
</div>
