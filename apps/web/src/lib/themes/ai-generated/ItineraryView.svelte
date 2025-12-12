<script lang="ts">
  import { goto } from "$app/navigation";
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import { auth } from "$lib/auth";
  import { authApi } from "$lib/api/auth";
  import { getIsDemoMode } from "$lib/demo";
  import { onMount } from "svelte";
  import StepList from "./StepList.svelte";
  import {
    AddStepForm,
    BottomNav,
    MemoDialog,
    PasswordDialog,
    ShareDialog,
    WalicaOverlay,
  } from "./components";
  import TripProgress from "./components/TripProgress.svelte";
  import HeroHeader from "./components/HeroHeader.svelte";
  import FloatingActions from "./components/FloatingActions.svelte";
  import ParticleBackground from "./components/ParticleBackground.svelte";
  import { renderMarkdown } from "./utils/markdown";
  import "./styles/index.css";

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
      date: string;
      time: string;
      location?: string;
      notes?: string;
    }) => Promise<void>;
    onUpdateStep?: (
      stepId: string,
      data: {
        title?: string;
        date?: string;
        time?: string;
        location?: string;
        notes?: string;
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

  let isEditingTitle = $state(false);
  let editedTitle = $state(itinerary.title);
  let isAddingStep = $state(false);
  let showCopyMessage = $state(false);
  let showShareDialog = $state(false);
  let hasEditPermission = $state(false);
  let showPasswordDialog = $state(false);
  let showMemoDialog = $state(false);
  let isAuthenticating = $state(false);

  let selectedThemeId = $state(itinerary.theme_id || "ai-generated");
  let secretModeEnabled = $state(itinerary.secret_settings?.enabled ?? false);
  let secretModeOffset = $state(
    itinerary.secret_settings?.offset_minutes ?? 60,
  );
  let walicaUrl = $state(
    itinerary.walica_id ? `https://walica.jp/group/${itinerary.walica_id}` : "",
  );
  let showWalica = $state(false);

  let newStep = $state({
    title: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });
  let newStepHour = $state("09");
  let newStepMinute = $state("00");
  let focusedDate = $state<string | null>(null);

  function openAddStepForm() {
    isAddingStep = true;
    if (focusedDate) {
      newStep.date = focusedDate;
    } else {
      newStep.date = "";
    }
  }

  onMount(() => {
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
      attemptEditModeActivation();
    }

    auth.updateAccessTime(itinerary.id, itinerary.title);
  });

  async function handlePasswordAuth(password: string) {
    if (!password.trim()) {
      alert("パスワードを入力してください");
      return;
    }

    isAuthenticating = true;
    try {
      const token = await authApi.authenticateWithPassword(
        itinerary.id,
        password,
      );
      auth.setToken(itinerary.id, itinerary.title, token);
      hasEditPermission = true;
      showPasswordDialog = false;
    } catch (error) {
      alert("パスワードが正しくありません");
    } finally {
      isAuthenticating = false;
    }
  }

  function handleEditModeToggle() {
    if (hasEditPermission) {
      hasEditPermission = false;
    } else {
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

    // パスワード未設定なら即座に編集可能、設定ありなら入力ダイアログ
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
    if (hasEditPermission) {
      showShareDialog = true;
    } else {
      copyViewOnlyLink();
    }
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

  async function handleAddStep() {
    if (!newStep.title.trim() || !newStep.date || !newStep.time) {
      alert("タイトル、日付、時刻は必須です");
      return;
    }
    if (onCreateStep) {
      await onCreateStep({
        title: newStep.title.trim(),
        date: newStep.date,
        time: newStep.time,
        location: newStep.location.trim() || undefined,
        notes: newStep.notes.trim() || undefined,
      });
      newStep = { title: "", date: "", time: "", location: "", notes: "" };
      newStepHour = "09";
      newStepMinute = "00";
      isAddingStep = false;
    }
  }

  function cancelAddStep() {
    newStep = { title: "", date: "", time: "", location: "", notes: "" };
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

  const tripDates = $derived(() => {
    if (steps.length === 0) return { start: undefined, end: undefined };
    const dates = [...new Set(steps.map((s) => s.date))].sort();
    return { start: dates[0], end: dates[dates.length - 1] };
  });
</script>

<div class="ai-theme">
  <ParticleBackground />

  <main class="ai-container">
    {#if showCopyMessage}
      <div class="ai-copy-toast">✓ コピーしました</div>
    {/if}

    <HeroHeader
      title={itinerary.title}
      startDate={tripDates().start}
      endDate={tripDates().end}
    />

    <TripProgress {steps} title={itinerary.title} />

    {#if itinerary.memo}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="ai-memo-section" onclick={() => (showMemoDialog = true)}>
        <div class="ai-memo-card ai-card">
          <div class="ai-memo-header">📝 メモ</div>
          <div class="ai-memo-content">
            {@html renderMarkdown(itinerary.memo)}
          </div>
        </div>
      </div>
    {:else if hasEditPermission}
      <button
        type="button"
        class="ai-btn ai-btn-secondary ai-btn-memo"
        onclick={() => (showMemoDialog = true)}
      >
        📝 メモを追加
      </button>
    {/if}

    {#if hasEditPermission && isAddingStep}
      <div class="ai-add-step-form">
        <AddStepForm
          bind:newStep
          bind:newStepHour
          bind:newStepMinute
          onSubmit={handleAddStep}
          onCancel={cancelAddStep}
        />
      </div>
    {/if}

    <StepList
      {steps}
      {hasEditPermission}
      {secretModeEnabled}
      {secretModeOffset}
      bind:focusedDate
      {onUpdateStep}
      {onDeleteStep}
    />
  </main>

  <FloatingActions
    onAdd={hasEditPermission ? openAddStepForm : undefined}
    onShare={handleShare}
  />

  <BottomNav
    {hasEditPermission}
    walicaId={itinerary.walica_id}
    {selectedThemeId}
    {secretModeEnabled}
    {secretModeOffset}
    {walicaUrl}
    onEditModeToggle={handleEditModeToggle}
    onThemeChange={handleThemeChange}
    onSecretModeChange={handleSecretModeUpdate}
    onWalicaUpdate={handleWalicaUpdate}
    onWalicaOpen={() => (showWalica = true)}
    onMemoOpen={() => (showMemoDialog = true)}
  />

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
    onAuth={handlePasswordAuth}
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
</div>
