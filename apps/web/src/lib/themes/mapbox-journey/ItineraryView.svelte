<script lang="ts">
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import StepList from "./StepList.svelte";
  import AddStepForm from "./components/AddStepForm.svelte";
  import { getAvailableThemes } from "$lib/themes";
  import { auth } from "$lib/auth";
  import { handlePasswordAuth } from "$lib/auth/handle-password-auth";
  import { authApi } from "$lib/api/auth";
  import { getIsDemoMode } from "$lib/demo";
  import {
    getMemoText,
    parseMemoData,
    stringifyMemoData,
    updateMemoText,
  } from "$lib/memo";
  import "./styles/index.css";

  let MapComponent: any = $state(null);

  type MapStyle = "day" | "night" | "satellite" | "pixel";

  interface Props {
    itinerary: ItineraryResponse;
    steps: Step[];
    onUpdateItinerary?: (data: any) => Promise<void>;
    onCreateStep?: (data: any) => Promise<void>;
    onUpdateStep?: (stepId: string, data: any) => Promise<void>;
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

  let showMenu = $state(false);
  let showAddModal = $state(false);
  let showThemeModal = $state(false);
  let showShareModal = $state(false);
  let showPasswordDialog = $state(false);
  let showSpotDetail = $state(false);
  let showRoute = $state(true);
  let showStylePicker = $state(false);
  let isViewMode = $state(false);
  let showControlPanel = $state(false);

  let hasEditPermission = $state(false);
  let password = $state("");
  let isAuthenticating = $state(false);
  let shareUrl = $state("");
  let copySuccess = $state(false);

  let mapStyle = $state<MapStyle>("night");
  let show3D = $state(true);

  let selectedStep = $state<Step | null>(null);
  let selectedStepIndex = $state<number>(0);
  let isEditing = $state(false);
  let editStepHour = $state("09");
  let editStepMinute = $state("00");
  let editStepId = $state<string>("");

  let editingStepForm = $state({
    title: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });

  let newStep = $state({
    title: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });
  let newStepHour = $state("09");
  let newStepMinute = $state("00");

  const DATE_COLORS = [
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#3B82F6",
    "#6366F1",
  ];

  function getUniqueDates(): string[] {
    const sortedSteps = [...steps].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
    return [...new Set(sortedSteps.map((s) => s.date))];
  }

  function getDateColor(date: string): string {
    const uniqueDates = getUniqueDates();
    const index = uniqueDates.indexOf(date);
    return DATE_COLORS[index % DATE_COLORS.length];
  }

  function getStepNumber(step: Step): number {
    const sortedSteps = [...steps].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
    return sortedSteps.findIndex((s) => s.id === step.id) + 1;
  }

  onMount(async () => {
    if (browser) {
      const module = await import("./components/MapboxMap.svelte");
      MapComponent = module.default;
      if (getIsDemoMode()) {
        hasEditPermission = true;
      } else {
        const token = auth.extractTokenFromUrl();
        if (token && itinerary.is_password_protected) {
          auth.setToken(itinerary.id, itinerary.title, token);
        }
        hasEditPermission = auth.hasEditPermission(itinerary.id);
        auth.updateAccessTime(itinerary.id, itinerary.title);
      }

      shareUrl = window.location.href.split("?")[0];

      const memoData = parseMemoData(itinerary.memo);
      if (typeof memoData.showRoute === "boolean") {
        showRoute = memoData.showRoute;
      }
      if (
        memoData.mapStyle &&
        ["day", "night", "satellite", "pixel"].includes(
          memoData.mapStyle as string,
        )
      ) {
        mapStyle = memoData.mapStyle as MapStyle;
      }
      if (typeof memoData.show3D === "boolean") {
        show3D = memoData.show3D;
      }
    }
  });

  function toggleViewMode() {
    if (!hasEditPermission) return;
    isViewMode = !isViewMode;
    showMenu = false;
    showAddModal = false;
    showSpotDetail = false;
  }

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

    // パスワード未設定なら編集可、設定ありなら入力ダイアログ
    if (!itinerary.is_password_protected) {
      hasEditPermission = true;
      auth.updateAccessTime(itinerary.id, itinerary.title);
    } else {
      showPasswordDialog = true;
    }
  }

  async function saveSettings() {
    const memoData = parseMemoData(itinerary.memo);
    memoData.showRoute = showRoute;
    memoData.mapStyle = mapStyle;
    memoData.show3D = show3D;

    if (onUpdateItinerary) {
      await onUpdateItinerary({ memo: stringifyMemoData(memoData) });
    }
  }

  let settingsChanged = $state(false);
  $effect(() => {
    const _ = [showRoute, mapStyle, show3D];
    if (!settingsChanged) {
      settingsChanged = true;
      return;
    }

    const timer = setTimeout(saveSettings, 500);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    if (mapStyle === "pixel" && show3D) {
      show3D = false;
    }
  });

  function toggleMenu() {
    showMenu = !showMenu;
  }

  function openAddModal(prefill?: { location?: string }) {
    showMenu = false;
    showAddModal = true;
    isEditing = false;
    const today = new Date().toISOString().split("T")[0];
    newStepHour = "09";
    newStepMinute = "00";
    newStep = {
      title: "",
      date: today,
      time: `${newStepHour}:${newStepMinute}`,
      location: prefill?.location ?? "",
      notes: "",
    };
  }

  async function handleAddSubmit() {
    if (!newStep.title || !newStep.date || !newStep.time) {
      alert("必須項目を入力してください");
      return;
    }
    const noteText = newStep.notes.trim();
    const notes = noteText ? updateMemoText(undefined, noteText) : undefined;
    if (onCreateStep) {
      await onCreateStep({
        title: newStep.title.trim(),
        date: newStep.date,
        time: newStep.time,
        location: newStep.location.trim() || undefined,
        notes: newStep.notes.trim() || undefined,
      });
      closeModals();
      resetForm();
    }
  }

  function handleStepClick(step: Step, index: number) {
    selectedStep = step;
    selectedStepIndex = index;
    showSpotDetail = true;
  }

  function openEditModal() {
    if (!selectedStep) return;
    editStepId = selectedStep.id;
    editingStepForm = {
      title: selectedStep.title,
      date: selectedStep.date,
      time: selectedStep.time,
      location: selectedStep.location || "",
      notes: getMemoText(selectedStep.notes),
    };
    const [h, m] = selectedStep.time.split(":");
    editStepHour = h;
    editStepMinute = m;
    isEditing = true;
    showSpotDetail = false;
    showAddModal = true;
  }

  async function handleEditSubmit() {
    if (!editStepId || !onUpdateStep) return;

    const noteText = editingStepForm.notes.trim();
    const notes = updateMemoText(selectedStep?.notes, noteText);

    const updatedData = {
      title: editingStepForm.title.trim(),
      date: editingStepForm.date,
      time: `${editStepHour}:${editStepMinute}`,
      location: editingStepForm.location.trim() || undefined,
      notes: editingStepForm.notes.trim() || undefined,
    };

    await onUpdateStep(editStepId, updatedData);
    closeModals();
  }

  async function handleDelete() {
    if (!editStepId || !onDeleteStep) return;
    if (confirm("この予定を削除しますか？")) {
      await onDeleteStep(editStepId);
      closeModals();
    }
  }

  function closeModals() {
    showAddModal = false;
    showThemeModal = false;
    showMenu = false;
    showShareModal = false;
    showSpotDetail = false;
    showPasswordDialog = false;
    showStylePicker = false;
    isEditing = false;
    editStepId = "";
    selectedStep = null;
  }

  function resetForm() {
    newStep = { title: "", date: "", time: "", location: "", notes: "" };
    newStepHour = "09";
    newStepMinute = "00";
  }

  async function handleThemeChange(themeId: string) {
    if (onUpdateItinerary) {
      const memoData = parseMemoData(itinerary.memo);
      delete memoData.showRoute;
      delete memoData.mapStyle;
      delete memoData.show3D;
      const nextMemo = stringifyMemoData(memoData);

      await onUpdateItinerary({ theme_id: themeId, memo: nextMemo });
      window.location.reload();
    }
  }

  async function reverseGeocode(lat: number, lng: number) {
    if (!browser) return null;
    const key = `mapbox-rev:${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = sessionStorage.getItem(key);
    if (cached) return cached;

    try {
      const res = await fetch(
        `/api/mapbox/geocode?lng=${lng}&lat=${lat}&limit=1`,
      );
      if (!res.ok) return null;
      const data = await res.json();
      const place = data.features?.[0]?.place_name as string | undefined;
      if (place) {
        sessionStorage.setItem(key, place);
        return place;
      }
    } catch (e) {
      console.error("Failed to reverse geocode", e);
    }
    return null;
  }

  async function handleMapClick(lat: number, lng: number) {
    if (!(hasEditPermission && !isViewMode)) return;
    const label =
      (await reverseGeocode(lat, lng)) ||
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    openAddModal({ location: label });
  }

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copySuccess = true;
      setTimeout(() => (copySuccess = false), 2000);
    } catch (e) {
      console.error("Failed to copy URL", e);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
  }
</script>

<div class="journey-container">
  <div class="journey-title-bar">
    <a class="home-btn" href="/" aria-label="Home">
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" />
      </svg>
    </a>
    <h1 class="journey-title">{itinerary.title}</h1>
    <button class="menu-btn" onclick={toggleMenu} aria-label="Menu">
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
      </svg>
    </button>
  </div>

  {#if MapComponent}
    <MapComponent
      {steps}
      onStepClick={handleStepClick}
      onMapClick={handleMapClick}
      {showRoute}
      {mapStyle}
      {show3D}
    />
  {:else}
    <div class="loading-screen">
      <div class="loader"></div>
      <span>旅を準備しています...</span>
    </div>
  {/if}

  <button
    class="control-toggle {showControlPanel ? 'open' : ''}"
    onclick={() => (showControlPanel = !showControlPanel)}
    aria-label="設定パネルを開閉"
  >
    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
      <path
        d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
      />
    </svg>
  </button>

  <div class="control-panel {showControlPanel ? 'open' : ''}">
    <div class="panel-header">
      <span class="panel-title">マップ設定</span>
      <button
        class="panel-close"
        onclick={() => (showControlPanel = false)}
        aria-label="閉じる"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>
    <div class="panel-section">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="panel-label">マップスタイル</label>
      <div class="style-buttons">
        <button
          class="style-btn {mapStyle === 'night' ? 'active' : ''}"
          onclick={() => (mapStyle = "night")}
        >
          🌙 ナイト
        </button>
        <button
          class="style-btn {mapStyle === 'day' ? 'active' : ''}"
          onclick={() => (mapStyle = "day")}
        >
          ☀️ デイ
        </button>
        <button
          class="style-btn {mapStyle === 'satellite' ? 'active' : ''}"
          onclick={() => (mapStyle = "satellite")}
        >
          🛰️ 衛星
        </button>
        <button
          class="style-btn {mapStyle === 'pixel' ? 'active' : ''}"
          onclick={() => (mapStyle = "pixel")}
        >
          🕹️ ピクセル
        </button>
      </div>
    </div>

    <div class="panel-divider"></div>

    <div class="panel-toggles">
      <label class="toggle-item">
        <input
          type="checkbox"
          bind:checked={show3D}
          disabled={mapStyle === "pixel"}
        />
        <span class="toggle-label">3Dビルディング</span>
      </label>
      <label class="toggle-item">
        <input type="checkbox" bind:checked={showRoute} />
        <span class="toggle-label">ルートライン</span>
      </label>
    </div>
  </div>

  <div class="legend-panel">
    <div class="legend-title">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        />
      </svg>
      旅程
    </div>
    {#each getUniqueDates() as date}
      <div class="legend-item">
        <span class="legend-dot" style="background: {getDateColor(date)}"
        ></span>
        <span class="legend-text">{formatDate(date)}</span>
      </div>
    {/each}
  </div>

  {#if !hasEditPermission}
    <button class="action-btn edit-btn" onclick={attemptEditModeActivation}>
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path
          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        />
      </svg>
      編集
    </button>
  {:else}
    <button class="action-btn view-btn" onclick={toggleViewMode}>
      {isViewMode ? "編集モード" : "閲覧モード"}
    </button>
  {/if}

  {#if hasEditPermission && !isViewMode}
    <button
      class="fab-btn"
      onclick={() => openAddModal()}
      aria-label="スポット追加"
    >
      <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
      </svg>
    </button>
  {/if}

  {#if showMenu}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-overlay" onclick={closeModals} role="presentation">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="menu-panel"
        onclick={(e) => e.stopPropagation()}
        role="menu"
        tabindex="0"
      >
        {#if hasEditPermission && !isViewMode}
          <button class="menu-item" onclick={() => openAddModal()}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            スポットを追加
          </button>
        {/if}
        <button
          class="menu-item"
          onclick={() => {
            showMenu = false;
            showShareModal = true;
          }}
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
            />
          </svg>
          共有する
        </button>
        {#if hasEditPermission && !isViewMode}
          <button
            class="menu-item"
            onclick={() => {
              showMenu = false;
              showThemeModal = true;
            }}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path
                d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
              />
            </svg>
            テーマを変更
          </button>
        {/if}
      </div>
    </div>
  {/if}

  {#if showSpotDetail && selectedStep}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-overlay" onclick={closeModals} role="presentation">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="detail-modal"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div class="detail-header">
          <div
            class="detail-number"
            style="background: linear-gradient(135deg, {getDateColor(
              selectedStep.date,
            )}, {getDateColor(selectedStep.date)}99)"
          >
            {getStepNumber(selectedStep)}
          </div>
          <div class="detail-info">
            <h3 class="detail-title">{selectedStep.title}</h3>
            <p class="detail-datetime">
              {formatDate(selectedStep.date)} • {selectedStep.time}
            </p>
          </div>
          <button class="close-btn" onclick={closeModals} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>

        {#if selectedStep.location}
          <div class="detail-section">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
              />
            </svg>
            <span>{selectedStep.location}</span>
          </div>
        {/if}

        {#if getMemoText(selectedStep.notes)}
          <div class="detail-section notes">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path
                d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
              />
            </svg>
            <span>{getMemoText(selectedStep.notes)}</span>
          </div>
        {/if}

        {#if hasEditPermission && !isViewMode}
          <button class="primary-btn" onclick={openEditModal}>
            スポットを編集
          </button>
        {/if}
      </div>
    </div>
  {/if}

  {#if showAddModal}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-overlay" onclick={closeModals} role="presentation">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="form-modal"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {#if isEditing}
          <AddStepForm
            bind:newStep={editingStepForm}
            bind:newStepHour={editStepHour}
            bind:newStepMinute={editStepMinute}
            isEditing={true}
            onSubmit={handleEditSubmit}
            onCancel={closeModals}
          />
          <button class="delete-btn" onclick={handleDelete}>
            このスポットを削除
          </button>
        {:else}
          <AddStepForm
            bind:newStep
            bind:newStepHour
            bind:newStepMinute
            onSubmit={handleAddSubmit}
            onCancel={closeModals}
          />
        {/if}
      </div>
    </div>
  {/if}

  {#if showShareModal}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-overlay" onclick={closeModals} role="presentation">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="share-modal"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <h3 class="modal-title">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
            />
          </svg>
          旅程を共有
        </h3>
        <p class="modal-desc">
          {#if itinerary.is_password_protected}
            このURLを共有してください。編集にはパスワードが必要です。
          {:else}
            このURLを共有してください。誰でも編集できます（パスワード未設定）。
          {/if}
        </p>
        <div class="share-input-wrapper">
          <input
            type="text"
            readonly
            value={shareUrl}
            class="share-input"
            style="color: #1a1a1a; font-weight: 500;"
          />
          <button class="copy-btn" onclick={copyShareUrl}>
            {#if copySuccess}
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            {:else}
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
              >
                <path
                  d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                />
              </svg>
            {/if}
          </button>
        </div>
        <button class="secondary-btn" onclick={closeModals}>閉じる</button>
      </div>
    </div>
  {/if}

  {#if showThemeModal}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="modal-overlay" onclick={closeModals} role="presentation">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="theme-modal"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <h3 class="modal-title">テーマを選択</h3>
        <div class="theme-list">
          {#each getAvailableThemes() as theme}
            <button
              class="theme-item {itinerary.theme_id === theme.id
                ? 'active'
                : ''}"
              onclick={() => handleThemeChange(theme.id)}
            >
              <span class="theme-name">{theme.name}</span>
              <span class="theme-desc">{theme.description}</span>
            </button>
          {/each}
        </div>
        <button class="secondary-btn" onclick={closeModals}>キャンセル</button>
      </div>
    </div>
  {/if}

  {#if showPasswordDialog}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="modal-overlay"
      onclick={() => {
        showPasswordDialog = false;
        password = "";
      }}
      role="presentation"
    >
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="password-modal"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <h3 class="modal-title">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path
              d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
            />
          </svg>
          パスワードを入力
        </h3>
        <form
          onsubmit={(e) => {
            e.preventDefault();
            onPasswordAuth();
          }}
        >
          <input
            type="password"
            bind:value={password}
            placeholder="パスワード"
            class="password-input"
            disabled={isAuthenticating}
          />
          <div class="btn-row">
            <button
              type="submit"
              class="primary-btn"
              disabled={isAuthenticating}
            >
              {isAuthenticating ? "認証中..." : "ロック解除"}
            </button>
            <button
              type="button"
              onclick={() => {
                showPasswordDialog = false;
                password = "";
              }}
              class="secondary-btn"
              disabled={isAuthenticating}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <StepList {steps} onStepClick={handleStepClick} />
</div>
