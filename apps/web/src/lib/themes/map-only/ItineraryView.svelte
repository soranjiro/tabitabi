<script lang="ts">
  import type { Itinerary, Step } from "@tabitabi/types";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import StepList from "./StepList.svelte";
  import AddStepForm from "./components/AddStepForm.svelte";
  import { getAvailableThemes } from "$lib/themes";
  import { auth } from "$lib/auth";
  import { authApi } from "$lib/api/auth";
  import "./styles/index.css";

  let MapComponent: any = $state(null);

  interface Props {
    itinerary: Itinerary;
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
  let showSecretModal = $state(false);
  let showShareModal = $state(false);
  let showPasswordDialog = $state(false);
  let showSpotDetail = $state(false);
  let showRoute = $state(false);
  let showStreetView = $state(false);
  let isViewMode = $state(false);

  let hasEditPermission = $state(false);
  let password = $state("");
  let isAuthenticating = $state(false);
  let shareUrl = $state("");
  let copySuccess = $state(false);

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

  let streetViewLocation = $state<{ lat: number; lng: number } | null>(null);
  let mapComponent: any = $state(null);
  let nextDirectionDeg = $state<number | null>(null);
  let showDirectionArrow = $state(false);
  let nextStepForDisplay = $state<Step | null>(null);

  let secretModeEnabled = $state(itinerary.secret_settings?.enabled ?? false);
  let secretModeOffset = $state(
    itinerary.secret_settings?.offset_minutes ?? 60,
  );

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
    "#4285F4",
    "#EA4335",
    "#34A853",
    "#FBBC05",
    "#9C27B0",
    "#00BCD4",
    "#FF5722",
    "#607D8B",
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

  function isSecretStep(stepDate: string, stepTime: string): boolean {
    if (!secretModeEnabled) return false;
    const now = new Date();
    const stepDateTime = new Date(`${stepDate}T${stepTime}:00`);
    return (
      now.getTime() < stepDateTime.getTime() - secretModeOffset * 60 * 1000
    );
  }

  function getNextStep(basedOnTime: boolean = true): Step | null {
    const sorted = [...steps].sort((a, b) => {
      const dc = a.date.localeCompare(b.date);
      if (dc !== 0) return dc;
      return a.time.localeCompare(b.time);
    });

    if (basedOnTime) {
      const now = new Date();
      for (const s of sorted) {
        const dt = new Date(`${s.date}T${s.time}:00`);
        if (dt.getTime() >= now.getTime()) return s;
      }
      return sorted.length ? sorted[sorted.length - 1] : null;
    } else if (selectedStep) {
      const idx = sorted.findIndex((s) => s.id === selectedStep!.id);
      if (idx >= 0 && idx + 1 < sorted.length) return sorted[idx + 1];
    }
    return null;
  }

  onMount(async () => {
    if (browser) {
      const module = await import("./components/Map.svelte");
      MapComponent = module.default;

      const token = auth.extractTokenFromUrl();
      if (token) {
        auth.setToken(itinerary.id, itinerary.title, token);
      }
      hasEditPermission = auth.hasEditPermission(itinerary.id);
      auth.updateAccessTime(itinerary.id, itinerary.title);

      shareUrl = window.location.href.split("?")[0];

      // Load route display preference from memo
      if (itinerary.memo) {
        try {
          const memoData = JSON.parse(itinerary.memo);
          if (typeof memoData.showRoute === "boolean") {
            showRoute = memoData.showRoute;
          }
        } catch (e) {
          // If memo is not JSON, ignore error
        }
      }
    }
  });

  function toggleViewMode() {
    if (!hasEditPermission) return;
    isViewMode = !isViewMode;
    showMenu = false;
    showAddModal = false;
    showSpotDetail = false;
    if (isViewMode) {
      // 閲覧モードではストリートビュー固定
      showStreetView = true;
    } else {
      // 編集モードではマップ表示
      showStreetView = false;
    }
  }

  async function handlePasswordAuth() {
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
      password = "";
    } catch (error) {
      alert("パスワードが正しくありません");
    } finally {
      isAuthenticating = false;
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
      }
      return;
    }

    showPasswordDialog = true;
  }

  // Auto-save route display preference to memo
  let routeSettingChanged = $state(false);
  $effect(() => {
    // Skip initial mount
    if (!routeSettingChanged && showRoute === false) {
      routeSettingChanged = true;
      return;
    }

    routeSettingChanged = true;

    // Debounce save to avoid too many updates
    const timer = setTimeout(async () => {
      try {
        let memoData: any = {};
        if (itinerary.memo) {
          try {
            memoData = JSON.parse(itinerary.memo);
          } catch (e) {
            // Keep original memo text if it's not JSON
            memoData.text = itinerary.memo;
          }
        }
        memoData.showRoute = showRoute;

        if (onUpdateItinerary) {
          await onUpdateItinerary({ memo: JSON.stringify(memoData) });
        }
      } catch (e) {
        console.error("Failed to save route preference", e);
      }
    }, 500);

    return () => clearTimeout(timer);
  });

  function toggleMenu() {
    showMenu = !showMenu;
  }

  function openAddModal() {
    showMenu = false;
    showAddModal = true;
    isEditing = false;
    const today = new Date().toISOString().split("T")[0];
    newStep.date = today;
  }

  async function handleAddSubmit() {
    if (!newStep.title || !newStep.date || !newStep.time) {
      alert("必須項目を入力してください");
      return;
    }
    if (onCreateStep) {
      await onCreateStep(newStep);
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
      notes: selectedStep.notes || "",
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

    const updatedData = {
      title: editingStepForm.title,
      date: editingStepForm.date,
      time: `${editStepHour}:${editStepMinute}`,
      location: editingStepForm.location,
      notes: editingStepForm.notes,
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
    showSecretModal = false;
    showMenu = false;
    showShareModal = false;
    showSpotDetail = false;
    showPasswordDialog = false;
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
      let nextMemo = itinerary.memo ?? "";
      try {
        const parsed = JSON.parse(nextMemo);
        if (parsed && typeof parsed === "object") {
          delete parsed.showRoute;
          if (typeof parsed.text === "string") {
            nextMemo = parsed.text;
          } else {
            const cleaned = { ...parsed };
            if (Object.keys(cleaned).length === 0) {
              nextMemo = "";
            } else {
              nextMemo = JSON.stringify(cleaned);
            }
          }
        }
      } catch (e) {
        // keep original memo text if not JSON
      }

      await onUpdateItinerary({ theme_id: themeId, memo: nextMemo });
      window.location.reload();
    }
  }

  function handleMapClick(lat: number, lng: number) {
    if (hasEditPermission && !isViewMode) {
      openAddModal();
    }
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

  function handleRouteToggle(checked: boolean) {
    showRoute = checked;
  }

  function openStreetView() {
    if (!selectedStep?.location || !mapComponent) return;

    const location = mapComponent.getLocationForStep(selectedStep);
    if (location) {
      streetViewLocation = location;
      showStreetView = true;
      showSpotDetail = false;
      mapComponent.openStreetViewAt(location.lat, location.lng);
      updateNextDirection();
    }
  }

  function closeStreetView() {
    showStreetView = false;
    streetViewLocation = null;
    nextDirectionDeg = null;
    showDirectionArrow = false;
  }

  function computeBearing(
    from: { lat: number; lng: number },
    to: { lat: number; lng: number },
  ): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const φ1 = toRad(from.lat);
    const φ2 = toRad(to.lat);
    const Δλ = toRad(to.lng - from.lng);
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x =
      Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ) + Math.sin(φ1) * Math.sin(φ2);
    const θ = Math.atan2(y, x);
    const bearing = (toDeg(θ) + 360) % 360;
    return bearing;
  }

  function updateNextDirection() {
    if (!mapComponent) return;
    const current = streetViewLocation;
    const next = getNextStep(true);
    if (!current || !next || !next.location) {
      nextDirectionDeg = null;
      showDirectionArrow = false;
      nextStepForDisplay = null;
      return;
    }
    const nextLoc = mapComponent.getLocationForStep(next);
    if (!nextLoc) {
      nextDirectionDeg = null;
      showDirectionArrow = false;
      nextStepForDisplay = null;
      return;
    }
    nextDirectionDeg = computeBearing(current, nextLoc);
    nextStepForDisplay = next;
    showDirectionArrow = true;
  }

  async function moveToCurrentLocation() {
    if (!navigator.geolocation || !mapComponent) return;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      streetViewLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
      mapComponent.openStreetViewAt(
        streetViewLocation.lat,
        streetViewLocation.lng,
      );
      updateNextDirection();
    } catch (e) {
      alert("現在地の取得に失敗しました");
    }
  }

  function moveTowardNextStep() {
    if (!mapComponent || !nextDirectionDeg || !streetViewLocation) return;
    const next = getNextStep(true);
    if (!next || !next.location) return;
    const nextLoc = mapComponent.getLocationForStep(next);
    if (!nextLoc) return;

    const lat1 = (streetViewLocation.lat * Math.PI) / 180;
    const lon1 = (streetViewLocation.lng * Math.PI) / 180;
    const lat2 = (nextLoc.lat * Math.PI) / 180;
    const lon2 = (nextLoc.lng * Math.PI) / 180;

    const R = 6371000;
    const distance =
      Math.acos(
        Math.sin(lat1) * Math.sin(lat2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1),
      ) * R;

    const moveDistance = Math.min(distance * 0.1, 50);
    const brng = (nextDirectionDeg * Math.PI) / 180;
    const lat3 =
      Math.asin(
        Math.sin(lat1) * Math.cos(moveDistance / R) +
          Math.cos(lat1) * Math.sin(moveDistance / R) * Math.cos(brng),
      ) *
      (180 / Math.PI);
    const lon3 =
      ((streetViewLocation.lng +
        Math.atan2(
          Math.sin(brng) * Math.sin(moveDistance / R) * Math.cos(lat1),
          Math.cos(moveDistance / R) -
            Math.sin(lat1) * Math.sin(lat3 * (Math.PI / 180)),
        ) *
          (180 / Math.PI) +
        540) %
        360) -
      180;

    streetViewLocation = { lat: lat3, lng: lon3 };
    mapComponent.openStreetViewAt(lat3, lon3);
    updateNextDirection();
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
</script>

<div class="map-theme-container">
  <div class="map-title-display">
    {itinerary.title}
  </div>

  <a class="home-button" href="/" aria-label="Home">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="20"
      height="20"
    >
      <path d="M12 3l9 8h-3v9h-5v-6H11v6H6v-9H3l9-8z" />
    </svg>
  </a>

  {#if MapComponent}
    <MapComponent
      bind:this={mapComponent}
      {steps}
      onStepClick={handleStepClick}
      onMapClick={handleMapClick}
      {showRoute}
    />
  {:else}
    <div class="loading">Loading Map...</div>
  {/if}

  {#if showStreetView && isViewMode}
    <button
      class="streetview-back-button"
      onclick={() => {
        if (mapComponent) mapComponent.closeStreetView();
        showStreetView = false;
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        width="20"
        height="20"
      >
        <path
          d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
        />
      </svg>
      地図に戻る
    </button>

    <button class="streetview-current-button" onclick={moveToCurrentLocation}>
      現在地へ移動
    </button>

    {#if showDirectionArrow && nextDirectionDeg !== null && nextStepForDisplay}
      <div class="direction-info">
        <div class="direction-info-text">
          <p class="next-destination">{nextStepForDisplay.title}</p>
          {#if !isSecretStep(nextStepForDisplay.date, nextStepForDisplay.time)}
            <p class="next-time">{nextStepForDisplay.time}</p>
          {/if}
        </div>
        <div
          class="direction-arrow"
          style="transform: rotate({nextDirectionDeg}deg)"
          aria-label="次の予定の方向"
        ></div>
        <button
          class="move-button"
          onclick={moveTowardNextStep}
          aria-label="次の目的地へ移動"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="20"
            height="20"
          >
            <path d="M12 2L4.5 20h15L12 2z" />
          </svg>
        </button>
      </div>
    {/if}
  {/if}

  <button class="menu-button" onclick={toggleMenu} aria-label="Menu">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="24"
      height="24"
    >
      <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
    </svg>
  </button>

  {#if !hasEditPermission}
    <button class="edit-mode-button" onclick={attemptEditModeActivation}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        width="16"
        height="16"
        style="display:inline-block;vertical-align:middle;margin-right:4px"
      >
        <path
          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        />
      </svg>
      編集
    </button>
  {:else}
    <button class="edit-mode-button" onclick={toggleViewMode}>
      {#if isViewMode}
        編集モードに戻る
      {:else}
        閲覧モードにする
      {/if}
    </button>
  {/if}

  <div class="legend-container">
    {#each getUniqueDates() as date}
      <div class="legend-item">
        <span class="legend-dot" style="background-color: {getDateColor(date)}"
        ></span>
        <span class="legend-text">{formatDate(date)}</span>
      </div>
    {/each}
    <label class="route-toggle">
      <input
        type="checkbox"
        bind:checked={showRoute}
        onchange={(e) =>
          handleRouteToggle((e.target as HTMLInputElement).checked)}
      />
      <button
        type="button"
        class="route-toggle-button"
        onclick={() => handleRouteToggle(true)}
      >
        経路表示
      </button>
    </label>
  </div>

  {#if showMenu}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="map-theme-overlay"
      onclick={() => (showMenu = false)}
      role="presentation"
    >
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="map-theme-menu"
        onclick={(e) => e.stopPropagation()}
        role="menu"
        tabindex="0"
      >
        {#if hasEditPermission && !isViewMode}
          <button class="map-theme-menu-item" onclick={openAddModal}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="20"
              height="20"
            >
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            新しい予定を追加
          </button>
        {/if}
        <button
          class="map-theme-menu-item"
          onclick={() => {
            showMenu = false;
            showShareModal = true;
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="20"
            height="20"
          >
            <path
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
            />
          </svg>
          共有
        </button>
        {#if hasEditPermission && !isViewMode}
          <button
            class="map-theme-menu-item"
            onclick={() => {
              showMenu = false;
              showThemeModal = true;
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="20"
              height="20"
            >
              <path
                d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
              />
            </svg>
            テーマ変更
          </button>
          <button
            class="map-theme-menu-item"
            onclick={() => {
              showMenu = false;
              showSecretModal = true;
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="20"
              height="20"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
              />
            </svg>
            シークレット機能
          </button>
        {/if}
        <button class="map-theme-menu-item" onclick={() => window.print()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="20"
            height="20"
          >
            <path
              d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"
            />
          </svg>
          印刷
        </button>
      </div>
    </div>
  {/if}

  {#if showSpotDetail && selectedStep}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="map-theme-overlay" onclick={closeModals} role="presentation">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="map-theme-modal spot-detail-modal"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div class="spot-header">
          <div
            class="spot-number"
            style="background-color: {getDateColor(selectedStep.date)}"
          >
            {getStepNumber(selectedStep)}
          </div>
          <div class="spot-info">
            <h3 class="spot-title">{selectedStep.title}</h3>
            <p class="spot-datetime">
              {formatDate(selectedStep.date)}
              {selectedStep.time}
            </p>
          </div>
        </div>

        {#if selectedStep.location}
          <div class="spot-section">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="16"
              height="16"
              class="spot-icon"
            >
              <path
                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
              />
            </svg>
            <span>{selectedStep.location}</span>
          </div>
        {/if}

        {#if selectedStep.notes}
          <div class="spot-section spot-notes">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="16"
              height="16"
              class="spot-icon"
            >
              <path
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
              />
            </svg>
            <div class="spot-notes-content">{selectedStep.notes}</div>
          </div>
        {/if}

        <div class="spot-actions">
          <button class="map-btn map-btn-streetview" onclick={openStreetView}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="16"
              height="16"
              style="display:inline-block;vertical-align:middle;margin-right:4px"
            >
              <path
                d="M12.56 14.33c-.34.27-.56.7-.56 1.17V21h7c1.1 0 2-.9 2-2v-5.98c-.94-.33-1.95-.52-3-.52-2.03 0-3.93.7-5.44 1.83zM9 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-7 7c0 1.1.9 2 2 2h5v-5.5c0-.67.27-1.28.72-1.72l.38-.38c-1.47-1.46-3.34-2.4-5.1-2.4-2.76 0-5 2.24-5 5v3zm17-5c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5z"
              />
            </svg>
            ストリートビュー
          </button>
          {#if hasEditPermission && !isViewMode}
            <button class="map-btn map-btn-primary" onclick={openEditModal}>
              編集する
            </button>
          {/if}
          <button class="map-btn map-btn-secondary" onclick={closeModals}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showAddModal}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="map-theme-overlay" onclick={closeModals} role="presentation">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="map-theme-modal"
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
          <div class="mt-4 pt-4 border-t border-gray-100">
            <button
              onclick={handleDelete}
              class="text-red-500 text-sm w-full text-center hover:underline"
            >
              この予定を削除
            </button>
          </div>
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
    <div class="map-theme-overlay" onclick={closeModals} role="presentation">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="map-theme-modal"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <h3 class="text-xl font-bold mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="20"
            height="20"
            style="display:inline-block;vertical-align:middle;margin-right:8px"
          >
            <path
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
            />
          </svg>
          共有
        </h3>
        <p class="text-sm text-gray-600 mb-4">
          このURLを共有すると、誰でも閲覧できます。
          {#if itinerary.password}
            編集にはパスワードが必要です。
          {:else}
            パスワードが未設定のため、誰でも編集できます。
          {/if}
        </p>
        <div class="share-url-container">
          <input
            type="text"
            readonly
            value={shareUrl}
            class="map-input share-url-input"
          />
          <button class="copy-btn" onclick={copyShareUrl}>
            {#if copySuccess}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="16"
                height="16"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            {:else}
              <svg
                xmlns="http://www.w3.org/2000/svg"
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
        <button onclick={closeModals} class="map-btn map-btn-secondary mt-4">
          閉じる
        </button>
      </div>
    </div>
  {/if}

  {#if showThemeModal}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="map-theme-overlay" onclick={closeModals} role="presentation">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="map-theme-modal"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <h3 class="text-xl font-bold mb-4">テーマを選択</h3>
        <div class="flex flex-col gap-2">
          {#each getAvailableThemes() as theme}
            <button
              class="p-3 text-left rounded hover:bg-gray-100 {itinerary.theme_id ===
              theme.id
                ? 'bg-blue-50 text-blue-600 font-bold'
                : ''}"
              onclick={() => handleThemeChange(theme.id)}
            >
              {theme.name}
            </button>
          {/each}
        </div>
        <button onclick={closeModals} class="mt-4 w-full p-2 text-gray-500"
          >キャンセル</button
        >
      </div>
    </div>
  {/if}

  {#if showThemeModal}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="map-theme-overlay" onclick={closeModals} role="presentation">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="map-theme-modal"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <h3 class="text-xl font-bold mb-4">テーマを選択</h3>
        <div class="flex flex-col gap-2">
          {#each getAvailableThemes() as theme}
            <button
              class="p-3 text-left rounded hover:bg-gray-100 {itinerary.theme_id ===
              theme.id
                ? 'bg-blue-50 text-blue-600 font-bold'
                : ''}"
              onclick={() => handleThemeChange(theme.id)}
            >
              {theme.name}
            </button>
          {/each}
        </div>
        <button onclick={closeModals} class="mt-4 w-full p-2 text-gray-500"
          >キャンセル</button
        >
      </div>
    </div>
  {/if}

  {#if showSecretModal}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div class="map-theme-overlay" onclick={closeModals} role="presentation">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div
        class="map-theme-modal secret-modal"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <h3 class="text-xl font-bold mb-4">🔒 シークレット機能</h3>
        <div class="flex flex-col gap-4">
          <label class="secret-mode-toggle">
            <input
              type="checkbox"
              bind:checked={secretModeEnabled}
              onchange={(e) => {
                const enabled = (e.target as HTMLInputElement).checked;
                handleSecretModeUpdate(enabled, secretModeOffset);
              }}
            />
            <span>シークレット機能を有効にする</span>
          </label>
          {#if secretModeEnabled}
            <div class="secret-offset-control">
              <label for="offset-minutes">表示開始時刻 (分前):</label>
              <input
                type="number"
                id="offset-minutes"
                bind:value={secretModeOffset}
                min="1"
                max="1440"
                onchange={() => {
                  handleSecretModeUpdate(secretModeEnabled, secretModeOffset);
                }}
              />
              <p class="text-sm text-gray-500 mt-2">
                予定時刻の指定分前から表示されます。デフォルト: 60分
              </p>
            </div>
          {/if}
        </div>
        <button onclick={closeModals} class="mt-4 w-full p-2 text-gray-500"
          >閉じる</button
        >
      </div>
    </div>
  {/if}

  {#if showPasswordDialog}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="map-theme-overlay"
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
        class="map-theme-modal"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <h3 class="text-xl font-bold mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="20"
            height="20"
            style="display:inline-block;vertical-align:middle;margin-right:8px"
          >
            <path
              d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
            />
          </svg>
          編集パスワード
        </h3>
        <form
          onsubmit={(e) => {
            e.preventDefault();
            handlePasswordAuth();
          }}
        >
          <input
            type="password"
            bind:value={password}
            placeholder="パスワードを入力"
            class="map-input"
            disabled={isAuthenticating}
          />
          <div class="flex gap-2 mt-4">
            <button
              type="submit"
              class="map-btn map-btn-primary"
              disabled={isAuthenticating}
            >
              {isAuthenticating ? "認証中..." : "認証"}
            </button>
            <button
              type="button"
              onclick={() => {
                showPasswordDialog = false;
                password = "";
              }}
              class="map-btn map-btn-secondary"
              disabled={isAuthenticating}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <StepList
    {steps}
    onStepClick={handleStepClick}
    {secretModeEnabled}
    {secretModeOffset}
  />
</div>

<style>
  .map-theme-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  .home-button {
    position: absolute;
    top: 24px;
    left: 20px;
    z-index: 1400;
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #333;
    text-decoration: none;
    transition:
      transform 0.1s,
      box-shadow 0.2s;
  }

  .home-button:hover {
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.2);
  }

  .home-button:active {
    transform: scale(0.97);
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    background: #f0f0f0;
  }

  .menu-button {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 1500;
    background: white;
    border: none;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: transform 0.1s;
  }

  .menu-button:active {
    transform: scale(0.95);
  }

  .edit-mode-button {
    position: absolute;
    top: 80px;
    right: 20px;
    z-index: 1500;
    background: white;
    border: none;
    border-radius: 24px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    cursor: pointer;
    transition: transform 0.1s;
  }

  .edit-mode-button:active {
    transform: scale(0.95);
  }

  .streetview-back-button {
    position: absolute;
    top: 20px;
    left: 70px;
    z-index: 1500;
    background: white;
    border: none;
    border-radius: 24px;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    cursor: pointer;
  }

  .streetview-current-button {
    position: absolute;
    top: 20px;
    right: 80px;
    z-index: 1500;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 24px;
    padding: 8px 12px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
    cursor: pointer;
  }

  .direction-arrow {
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-bottom: 24px solid rgba(255, 0, 0, 0.9);
    transform-origin: 50% 50%;
  }

  .streetview-back-button {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    background: white;
    border: none;
    border-radius: 24px;
    padding: 10px 20px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    transition:
      transform 0.1s,
      box-shadow 0.2s;
  }

  .streetview-back-button:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  }

  .streetview-back-button:active {
    transform: translateX(-50%) scale(0.95);
  }

  .legend-container {
    position: absolute;
    bottom: 20px;
    left: 20px;
    z-index: 900;
    background: white;
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 200px;
    max-height: 300px;
    overflow-y: auto;
    pointer-events: auto;
  }

  .legend-container::-webkit-scrollbar {
    width: 6px;
  }

  .legend-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .legend-container::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }

  .legend-container::-webkit-scrollbar-thumb:hover {
    background: #999;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .legend-text {
    font-size: 12px;
    color: #333;
  }

  .route-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #666;
    cursor: pointer;
    padding-top: 8px;
    border-top: 1px solid #eee;
    margin-top: 4px;
  }

  .route-toggle input {
    cursor: pointer;
  }

  .route-toggle-button {
    border: none;
    background: #f5f5f5;
    padding: 6px 10px;
    border-radius: 8px;
    font-size: 12px;
    cursor: pointer;
    transition:
      background 0.2s,
      transform 0.1s;
  }

  .route-toggle-button:hover {
    background: #e9e9e9;
  }

  .route-toggle-button:active {
    transform: scale(0.98);
  }

  .spot-detail-modal {
    max-width: 360px;
  }

  .spot-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }

  .spot-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    color: white;
    font-weight: bold;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .spot-info {
    flex: 1;
    min-width: 0;
  }

  .spot-title {
    font-size: 18px;
    font-weight: bold;
    margin: 0 0 4px 0;
    word-break: break-word;
  }

  .spot-datetime {
    font-size: 14px;
    color: #666;
    margin: 0;
  }

  .spot-section {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
    background: #f5f5f5;
    border-radius: 8px;
    margin-bottom: 8px;
    font-size: 14px;
  }

  .spot-icon {
    flex-shrink: 0;
    display: inline-block;
    vertical-align: middle;
  }

  .spot-notes {
    white-space: pre-wrap;
    flex-direction: column;
    align-items: flex-start;
  }

  .spot-notes-content {
    width: 100%;
    word-break: break-word;
  }

  .spot-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
  }

  .share-url-container {
    display: flex;
    gap: 8px;
  }

  .share-url-input {
    flex: 1;
    font-size: 12px;
    color: #1a1a1a;
    font-weight: 500;
  }

  .copy-btn {
    padding: 8px 16px;
    background: #4285f4;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 16px;
  }

  .copy-btn:active {
    opacity: 0.8;
  }

  .mt-4 {
    margin-top: 16px;
  }

  .pt-4 {
    padding-top: 16px;
  }

  .border-t {
    border-top-width: 1px;
  }

  .border-gray-100 {
    border-color: #f3f4f6;
  }

  .text-red-500 {
    color: #ef4444;
  }

  .text-sm {
    font-size: 0.875rem;
  }

  .w-full {
    width: 100%;
  }

  .text-center {
    text-align: center;
  }

  .hover\:underline:hover {
    text-decoration: underline;
  }

  .flex {
    display: flex;
  }

  .flex-col {
    flex-direction: column;
  }

  .gap-2 {
    gap: 0.5rem;
  }

  .p-3 {
    padding: 0.75rem;
  }

  .text-left {
    text-align: left;
  }

  .rounded {
    border-radius: 0.25rem;
  }

  .hover\:bg-gray-100:hover {
    background-color: #f3f4f6;
  }

  .bg-blue-50 {
    background-color: #eff6ff;
  }

  .text-blue-600 {
    color: #2563eb;
  }

  .font-bold {
    font-weight: 700;
  }

  .text-gray-500 {
    color: #6b7280;
  }

  .text-gray-600 {
    color: #4b5563;
  }

  .mb-4 {
    margin-bottom: 1rem;
  }

  .text-xl {
    font-size: 1.25rem;
  }

  .secret-modal {
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border: 2px solid rgba(255, 255, 255, 0.8);
  }

  .secret-mode-toggle {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 15px;
    color: #333;
    cursor: pointer;
    padding: 12px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    transition: all 0.2s ease;
  }

  .secret-mode-toggle:hover {
    background: #fafafa;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .secret-mode-toggle input {
    cursor: pointer;
    width: 18px;
    height: 18px;
    accent-color: #4285f4;
  }

  .secret-offset-control {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    background: white;
    border-radius: 10px;
    border-left: 4px solid #4285f4;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .secret-offset-control label {
    font-size: 14px;
    font-weight: 600;
    color: #1a73e8;
  }

  .secret-offset-control input {
    padding: 10px 12px;
    border: 2px solid #e8f0fe;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.2s ease;
  }

  .secret-offset-control input:focus {
    outline: none;
    border-color: #4285f4;
    background: #f8f9fa;
  }

  .secret-offset-control .text-sm {
    font-size: 12px;
    color: #5f6368;
    line-height: 1.5;
  }

  .mt-2 {
    margin-top: 8px;
  }

  .direction-info {
    position: absolute;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1500;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .direction-info-text {
    text-align: center;
    background: rgba(255, 255, 255, 0.98);
    border-radius: 12px;
    padding: 12px 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(10px);
  }

  .next-destination {
    margin: 0;
    font-weight: 700;
    font-size: 15px;
    color: #202124;
    letter-spacing: 0.2px;
  }

  .next-time {
    margin: 6px 0 0 0;
    font-size: 13px;
    color: #5f6368;
  }

  .move-button {
    background: linear-gradient(135deg, #ff5722 0%, #ff8a50 100%);
    color: white;
    border: none;
    border-radius: 50%;
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(255, 87, 34, 0.3);
    transition: all 0.2s ease;
  }

  .move-button:hover {
    background: linear-gradient(135deg, #f4511e 0%, #ff7043 100%);
    box-shadow: 0 6px 16px rgba(255, 87, 34, 0.4);
    transform: translateY(-2px);
  }

  .move-button:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(255, 87, 34, 0.2);
  }
</style>
