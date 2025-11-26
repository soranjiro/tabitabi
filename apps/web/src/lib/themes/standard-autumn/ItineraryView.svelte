<script lang="ts">
  import type { Itinerary, Step } from "@tabitabi/types";
  import { getAvailableThemes } from "$lib/themes";
  import { auth } from "$lib/auth";
  import { authApi } from "$lib/api/auth";
  import { onMount } from "svelte";
  import StepList from "./StepList.svelte";
  import AddStepForm from "./components/AddStepForm.svelte";
  import BottomNav from "./components/BottomNav.svelte";
  import FloatingActions from "./components/FloatingActions.svelte";
  import MemoDialog from "./components/MemoDialog.svelte";
  import PasswordDialog from "./components/PasswordDialog.svelte";
  import ShareDialog from "./components/ShareDialog.svelte";
  import WalicaOverlay from "./components/WalicaOverlay.svelte";
  import { LinkIcon } from "./components/icons/index.svelte";
  import { renderMarkdown } from "./utils/markdown";
  import "./styles/index.css";

  interface Props {
    itinerary: Itinerary;
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

  const themes = getAvailableThemes();

  let isEditingTitle = $state(false);
  let editedTitle = $state(itinerary.title);
  let isAddingStep = $state(false);
  let showCopyMessage = $state(false);
  let showShareDialog = $state(false);
  let hasEditPermission = $state(false);
  let showPasswordDialog = $state(false);
  let showMemoDialog = $state(false);
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
    const token = auth.extractTokenFromUrl();
    if (token) {
      auth.setToken(itinerary.id, itinerary.title, token);
    }
    hasEditPermission = auth.hasEditPermission(itinerary.id);

    if (!hasEditPermission && !itinerary.password) {
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
    const token = auth.getToken(itinerary.id);

    if (token) {
      const isValid = await authApi.verifyToken(itinerary.id);
      if (isValid) {
        hasEditPermission = true;
        return;
      }
    }

    if (!itinerary.password) {
      try {
        const token = await authApi.authenticateWithPassword(itinerary.id, "");
        auth.setToken(itinerary.id, itinerary.title, token);
        hasEditPermission = true;
      } catch (e) {
        console.error("Failed to authenticate without password", e);
        alert("認証に失敗しました");
      }
      return;
    }

    showPasswordDialog = true;
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
</script>

<div class="standard-autumn-theme">
  <div class="standard-autumn-container">
    <header class="standard-autumn-header">
      <button
        type="button"
        class="standard-autumn-share-icon"
        onclick={handleShare}
        aria-label="共有リンクをコピー"
        title="リンクをコピー"
      >
        {@html LinkIcon}
      </button>
      {#if showCopyMessage}
        <div class="standard-autumn-copy-msg">コピーしました</div>
      {/if}
      {#if isEditingTitle}
        <input
          type="text"
          bind:value={editedTitle}
          onblur={handleTitleUpdate}
          onkeydown={(e) => e.key === "Enter" && handleTitleUpdate()}
          class="standard-autumn-title-input"
        />
      {:else}
        <button
          type="button"
          onclick={() => {
            isEditingTitle = true;
          }}
          class="standard-autumn-title-button"
          disabled={!hasEditPermission}>{itinerary.title}</button
        >
      {/if}
      <div class="standard-autumn-controls">
        {#if itinerary.memo}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div
            class="standard-autumn-memo-display"
            onclick={(e) => {
              if ((e.target as HTMLElement).closest("a")) return;
              if (hasEditPermission) {
                showMemoDialog = true;
              }
            }}
          >
            {@html renderMarkdown(itinerary.memo)}
          </div>
        {:else if hasEditPermission}
          <button
            onclick={() => {
              showMemoDialog = true;
            }}
            class="standard-autumn-btn standard-autumn-btn-edit"
          >
            📝 メモを追加
          </button>
        {/if}
      </div>
    </header>

    {#if hasEditPermission}
      <div class="standard-autumn-add-step">
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
            class="standard-autumn-btn-add"
            disabled={!hasEditPermission}>＋ 予定を追加</button
          >
        {/if}
      </div>
    {/if}

    <StepList
      {steps}
      {onUpdateStep}
      {onDeleteStep}
      {hasEditPermission}
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
      onThemeChange={handleThemeChange}
      onSecretModeChange={handleSecretModeUpdate}
      onWalicaUpdate={handleWalicaUpdate}
      onWalicaOpen={() => (showWalica = true)}
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

  <FloatingActions
    {hasEditPermission}
    onAddStep={openAddStepForm}
  />
</div>
