<script lang="ts">
  import { goto } from "$app/navigation";
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import { getAvailableThemes } from "$lib/themes";
  import { auth } from "$lib/auth";
  import { handlePasswordAuth } from "$lib/auth/handle-password-auth";
  import { authApi } from "$lib/api/auth";
  import { getMemoText, updateMemoText } from "$lib/memo";
  import { onMount } from "svelte";
  import StepList from "./StepList.svelte";
  import SettingsMenu from "./components/SettingsMenu.svelte";
  import ThemeDialog from "./components/ThemeDialog.svelte";
  import MemoDialog from "./components/MemoDialog.svelte";
  import PasswordDialog from "./components/PasswordDialog.svelte";
  import AddStepForm from "./components/AddStepForm.svelte";
  import SettingsPanel from "./components/SettingsPanel.svelte";
  import WalicaOverlay from "./components/WalicaOverlay.svelte";
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

  const themes = getAvailableThemes();

  let isEditingTitle = $state(false);
  let editedTitle = $state(itinerary.title);
  let isAddingStep = $state(false);
  let hasEditPermission = $state(false);
  let showPasswordDialog = $state(false);
  let showMemoDialog = $state(false);
  let showThemeMenu = $state(false);
  let showSettingsMenu = $state(false);
  let showWalicaOverlay = $state(false);
  let editedMemo = $state(getMemoText(itinerary.memo));
  let password = $state("");
  let isAuthenticating = $state(false);
  let secretModeEnabled = $state(itinerary.secret_settings?.enabled ?? false);
  let secretModeOffset = $state(
    itinerary.secret_settings?.offset_minutes ?? 60,
  );
  let walicaId = $state(itinerary.walica_id ?? "");

  let newStep = $state({
    title: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });
  let newStepHour = $state("09");
  let newStepMinute = $state("00");

  let themeContainer: HTMLDivElement | undefined = $state();

  $effect(() => {
    const hour = newStepHour.padStart(2, "0");
    const minute = newStepMinute.padStart(2, "0");
    newStep.time = `${hour}:${minute}`;
  });

  function handleDocumentClick(e: MouseEvent) {
    // Close menu when clicking outside (except on the menu button itself)
    if (showSettingsMenu) {
      const menuBtn = document.querySelector(".menu-btn");
      if (menuBtn && !menuBtn.contains(e.target as Node)) {
        const menu = document.querySelector(".settings-menu");
        if (menu && !menu.contains(e.target as Node)) {
          showSettingsMenu = false;
        }
      }
    }
  }

  onMount(() => {
    const token = auth.extractTokenFromUrl();
    if (token && itinerary.is_password_protected) {
      auth.setToken(itinerary.id, itinerary.title, token);
    }
    hasEditPermission = auth.hasEditPermission(itinerary.id);
    auth.updateAccessTime(itinerary.id, itinerary.title);

    // Add global click listener to close menu when clicking outside
    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  });

  async function onPasswordAuth() {
    await handlePasswordAuth({
      shioriId: itinerary.id,
      title: itinerary.title,
      password,
      onSuccess: () => {
        hasEditPermission = true;
        showPasswordDialog = false;
        password = "";
      },
      onError: (message) => alert(message),
      setAuthenticating: (value) => (isAuthenticating = value),
    });
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

    if (!itinerary.is_password_protected) {
      hasEditPermission = true;
      auth.updateAccessTime(itinerary.id, itinerary.title);
      return;
    }

    showPasswordDialog = true;
  }

  function exitEditMode() {
    hasEditPermission = false;
    isEditingTitle = false;
    isAddingStep = false;
  }

  async function handleTitleUpdate() {
    if (!editedTitle.trim()) {
      alert("タイトルは必須です");
      editedTitle = itinerary.title;
      isEditingTitle = false;
      return;
    }
    if (onUpdateItinerary) {
      await onUpdateItinerary({ title: editedTitle.trim() });
    }
    isEditingTitle = false;
  }

  async function handleCreateStep() {
    if (
      !newStep.title.trim() ||
      !newStep.date ||
      !newStepHour.trim() ||
      !newStepMinute.trim()
    ) {
      alert("タイトル、日付、時刻は必須です");
      return;
    }

    if (onCreateStep) {
      try {
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
      } catch (error) {
        console.error("Failed to create step:", error);
        alert("予定の作成に失敗しました");
      }
    }
  }

  async function handleMemoUpdate() {
    if (onUpdateItinerary) {
      const memoText = editedMemo.trim();
      const memo = updateMemoText(itinerary.memo, memoText);
      await onUpdateItinerary({ memo });
    }
    showMemoDialog = false;
  }

  async function handleThemeChange(themeId: string) {
    if (onUpdateItinerary) {
      await onUpdateItinerary({ theme_id: themeId });
    }
    showThemeMenu = false;
  }

  async function handleWalicaUpdate() {
    if (onUpdateItinerary) {
      const id = walicaId.trim() || null;
      await onUpdateItinerary({ walica_id: id });
      showSettingsMenu = false;
    }
  }

  async function handleSecretModeUpdate() {
    if (onUpdateItinerary) {
      await onUpdateItinerary({
        secret_settings: secretModeEnabled
          ? { enabled: true, offset_minutes: secretModeOffset }
          : null,
      });
      showSettingsMenu = false;
    }
  }

  function copyShareUrl() {
    const url = `${window.location.origin}/${itinerary.id}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("閲覧URLをコピーしました");
    });
  }

  function copyEditUrl() {
    if (!auth.getToken(itinerary.id)) {
      alert("編集URLはコピーできません。編集モードでURLを確認してください。");
      return;
    }
    const token = auth.getToken(itinerary.id);
    const url = `${window.location.origin}/${itinerary.id}?token=${token}`;
    navigator.clipboard.writeText(url).then(() => {
      alert("編集URLをコピーしました");
    });
  }

  function handlePrint() {
    window.print();
  }

  const dateRange = $derived.by(() => {
    if (steps.length === 0) return { start: "", end: "" };
    const dates = steps.map((s) => s.date).sort();
    return {
      start: dates[0],
      end: dates[dates.length - 1],
    };
  });
</script>

<div class="simple-calendar-theme">
  <header class="header">
    <div class="header-top">
      <button class="home-btn" onclick={() => goto("/")}> ホーム </button>
      <div class="header-spacer"></div>

      {#if hasEditPermission}
        <button
          class="add-btn"
          title="新しい予定を追加"
          onclick={() => (isAddingStep = true)}
        >
          + 予定を追加
        </button>
        <button class="mode-btn active" onclick={exitEditMode}>
          編集中を終了
        </button>
      {:else}
        <button class="mode-btn" onclick={attemptEditModeActivation}>
          編集
        </button>
      {/if}

      <button
        class="menu-btn"
        onclick={() => (showSettingsMenu = !showSettingsMenu)}
      >
        ≡
      </button>
    </div>

    <SettingsMenu
      show={showSettingsMenu}
      {hasEditPermission}
      onCopyShareUrl={copyShareUrl}
      onCopyEditUrl={copyEditUrl}
      onChangeTheme={() => (showThemeMenu = true)}
      onEditMemo={() => (showMemoDialog = true)}
      onPrint={handlePrint}
    />

    <div class="title-section">
      {#if isEditingTitle && hasEditPermission}
        <div class="title-input-group">
          <input
            type="text"
            bind:value={editedTitle}
            placeholder="タイトルを入力"
          />
          <button class="btn-save" onclick={handleTitleUpdate}>保存</button>
          <button
            class="btn-cancel"
            onclick={() => {
              editedTitle = itinerary.title;
              isEditingTitle = false;
            }}
          >
            キャンセル
          </button>
        </div>
      {:else}
        <h1
          class="title"
          ondblclick={hasEditPermission
            ? () => (isEditingTitle = true)
            : undefined}
        >
          {itinerary.title}
        </h1>
      {/if}

      {#if dateRange.start && dateRange.end}
        <div class="date-range">
          {new Date(dateRange.start).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
          })}
          →
          {new Date(dateRange.end).toLocaleDateString("ja-JP", {
            month: "short",
            day: "numeric",
          })}
        </div>
      {/if}
    </div>
  </header>

  <ThemeDialog
    show={showThemeMenu}
    {themes}
    currentThemeId={itinerary.theme_id}
    onSelectTheme={() => handleThemeChange}
    onClose={() => (showThemeMenu = false)}
  />

  <MemoDialog
    show={showMemoDialog}
    bind:memoText={editedMemo}
    onSave={handleMemoUpdate}
    onClose={() => {
      editedMemo = getMemoText(itinerary.memo);
      showMemoDialog = false;
    }}
  />

  <PasswordDialog
    show={showPasswordDialog}
    bind:password
    {isAuthenticating}
    onSubmit={onPasswordAuth}
    onClose={() => (showPasswordDialog = false)}
  />

  <WalicaOverlay
    show={showWalicaOverlay}
    walicaId={itinerary.walica_id}
    onClose={() => (showWalicaOverlay = false)}
  />

  <main class="main-content">
    {#if !hasEditPermission && itinerary.memo && getMemoText(itinerary.memo).trim()}
      <div class="memo-banner">
        <div class="memo-label">メモ</div>
        <div class="memo-text">
          {getMemoText(itinerary.memo)}
        </div>
      </div>
    {/if}

    {#if itinerary.walica_id}
      <div class="walica-banner">
        <button onclick={() => (showWalicaOverlay = true)}>
          Walicaグループを表示
        </button>
      </div>
    {/if}

    {#if itinerary.secret_settings?.enabled}
      <div class="secret-banner">
        シークレットモード有効 (公開まで {itinerary.secret_settings
          .offset_minutes}分)
      </div>
    {/if}

    <section class="section">
      <StepList {steps} {hasEditPermission} {onUpdateStep} {onDeleteStep} />
    </section>
  </main>

  {#if hasEditPermission}
    <div class="edit-forms">
      <AddStepForm
        bind:isAddingStep
        bind:newStep
        bind:newStepHour
        bind:newStepMinute
        {onCreateStep}
      />

      <SettingsPanel
        bind:walicaId
        bind:secretModeEnabled
        bind:secretModeOffset
        onWalicaUpdate={handleWalicaUpdate}
        onSecretModeUpdate={handleSecretModeUpdate}
      />
    </div>
  {/if}
</div>
