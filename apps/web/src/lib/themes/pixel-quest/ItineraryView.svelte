<script lang="ts">
  import { goto } from "$app/navigation";
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import { getAvailableThemes } from "$lib/themes";
  import { auth } from "$lib/auth";
  import { getIsDemoMode } from "$lib/demo";
  import { authApi } from "$lib/api/auth";
  import { onMount } from "svelte";
  import { ContinuousMap, DetailPanel } from "./components";
  import {
    groupStepsByDate,
    calculateZones,
    formatDate,
    findCurrentSpotIndex,
  } from "./utils/layout";
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
  let isEditMode = $state(false);
  let editedTitle = $state(itinerary.title);
  let selectedStep = $state<Step | null>(null);
  let hasEditPermission = $state(false);
  let showPasswordDialog = $state(false);
  let password = $state("");
  let isAuthenticating = $state(false);
  let showAddForm = $state(false);
  let showEditForm = $state(false);
  let showShareDialog = $state(false);
  let showThemeDialog = $state(false);
  let showCopyMessage = $state(false);
  let showStatusBar = $state(true);
  let questExp = $state(0);
  let questLevel = $state(1);
  let showLevelUp = $state(false);
  let weatherType = $state<"sunny" | "cloudy" | "rainy">("sunny");
  let currentTime = $state("");
  let mapHeight = $state(400);

  let newStep = $state({
    title: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });
  let newStepHour = $state("09");
  let newStepMinute = $state("00");

  let editStep = $state({
    title: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });
  let editStepHour = $state("09");
  let editStepMinute = $state("00");
  let editingStepId = $state<string | null>(null);

  let selectedThemeId = $state(itinerary.theme_id || "pixel-quest");

  interface GameData {
    coins: number;
    exp: number;
    defeatedMonsters: number[];
    openedChests: number[];
    collectedCoins: number[];
  }

  const GAME_LIMITS = {
    maxCoins: 99999,
    maxExp: 999999,
    maxArrayLength: 1000,
    maxIdValue: 10000,
  };

  const defaultGameData: GameData = {
    coins: 0,
    exp: 0,
    defeatedMonsters: [],
    openedChests: [],
    collectedCoins: [],
  };

  function isValidNumber(val: unknown): val is number {
    return typeof val === "number" && Number.isFinite(val) && val >= 0;
  }

  function isValidIdArray(val: unknown): val is number[] {
    if (!Array.isArray(val)) return false;
    if (val.length > GAME_LIMITS.maxArrayLength) return false;
    return val.every(
      (id) =>
        typeof id === "number" &&
        Number.isInteger(id) &&
        id >= 0 &&
        id < GAME_LIMITS.maxIdValue,
    );
  }

  function sanitizeGameData(data: unknown): GameData {
    if (!data || typeof data !== "object") return { ...defaultGameData };

    const obj = data as Record<string, unknown>;

    return {
      coins: isValidNumber(obj.coins)
        ? Math.min(Math.floor(obj.coins), GAME_LIMITS.maxCoins)
        : 0,
      exp: isValidNumber(obj.exp)
        ? Math.min(Math.floor(obj.exp), GAME_LIMITS.maxExp)
        : 0,
      defeatedMonsters: isValidIdArray(obj.defeatedMonsters)
        ? [...new Set(obj.defeatedMonsters)]
        : [],
      openedChests: isValidIdArray(obj.openedChests)
        ? [...new Set(obj.openedChests)]
        : [],
      collectedCoins: isValidIdArray(obj.collectedCoins)
        ? [...new Set(obj.collectedCoins)]
        : [],
    };
  }

  function parseGameData(memo: string | null | undefined): GameData {
    if (!memo) return { ...defaultGameData };
    if (memo.length > 50000) return { ...defaultGameData };

    try {
      const parsed = JSON.parse(memo);
      if (parsed.gameData) {
        return sanitizeGameData(parsed.gameData);
      }
    } catch {
      // invalid JSON
    }
    return { ...defaultGameData };
  }

  let gameData = $state<GameData>(parseGameData(itinerary.memo));
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  async function handleGameDataChange(newData: GameData) {
    const sanitized = sanitizeGameData(newData);
    gameData = sanitized;

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(async () => {
      if (onUpdateItinerary) {
        let existingMemo: Record<string, unknown> = {};
        try {
          if (itinerary.memo && itinerary.memo.length < 50000) {
            existingMemo = JSON.parse(itinerary.memo);
          }
        } catch {
          // invalid JSON
        }
        const updatedMemo = JSON.stringify({
          ...existingMemo,
          gameData: sanitized,
        });
        await onUpdateItinerary({ memo: updatedMemo });
      }
    }, 500);
  }

  const groups = $derived(groupStepsByDate(steps));
  const zones = $derived(calculateZones(groups));

  const completedQuests = $derived(() => {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return steps.filter(
      (s) => s.date < today || (s.date === today && s.time <= currentTimeStr),
    ).length;
  });

  const totalQuests = $derived(steps.length);
  const progressPercent = $derived(
    totalQuests > 0 ? Math.round((completedQuests() / totalQuests) * 100) : 0,
  );

  function updateGameStats() {
    const completed = completedQuests();
    const newExp = completed * 25;
    const newLevel = Math.floor(newExp / 100) + 1;

    if (newLevel > questLevel) {
      showLevelUp = true;
      setTimeout(() => (showLevelUp = false), 2000);
    }

    questExp = newExp % 100;
    questLevel = newLevel;
  }

  function updateTime() {
    const now = new Date();
    currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  function randomWeather() {
    const weathers: Array<"sunny" | "cloudy" | "rainy"> = [
      "sunny",
      "sunny",
      "cloudy",
      "rainy",
    ];
    weatherType = weathers[Math.floor(Math.random() * weathers.length)];
  }

  onMount(() => {
    (async () => {
      // In demo mode, skip auth checks and allow editing locally
      if (getIsDemoMode()) {
        hasEditPermission = true;
      } else {
        const fromUrl = auth.extractTokenFromUrl();
        if (fromUrl) {
          auth.setToken(itinerary.id, itinerary.title, fromUrl);
        }
        const token = auth.getToken(itinerary.id);
        if (token) {
          const valid = await authApi.verifyToken(itinerary.id);
          hasEditPermission = valid;
          if (valid) auth.updateAccessTime(itinerary.id, itinerary.title);
        }
      }
    })();

    updateGameStats();
    updateTime();
    randomWeather();

    if (window.innerHeight > 600) {
      mapHeight = Math.min(window.innerHeight - 120, 600);
    }

    const timeInterval = setInterval(updateTime, 60000);
    const statsInterval = setInterval(updateGameStats, 30000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(statsInterval);
    };
  });

  function handleSelectStep(step: Step) {
    selectedStep = step;
  }

  function closeDetailPanel() {
    selectedStep = null;
  }

  async function handleTitleSave() {
    if (!editedTitle.trim()) return;
    if (onUpdateItinerary) {
      await onUpdateItinerary({ title: editedTitle.trim() });
    }
    isEditingTitle = false;
  }

  function openAddForm() {
    const today = new Date().toISOString().split("T")[0];
    newStep = {
      title: "",
      date: today,
      time: "",
      location: "",
      notes: "",
    };
    newStepHour = "09";
    newStepMinute = "00";
    showAddForm = true;
  }

  function closeAddForm() {
    showAddForm = false;
    newStep = { title: "", date: "", time: "", location: "", notes: "" };
  }

  async function handleAddStep() {
    if (!newStep.title.trim() || !newStep.date) {
      alert("Title and date are required");
      return;
    }
    const time = `${newStepHour}:${newStepMinute}`;
    if (onCreateStep) {
      await onCreateStep({
        title: newStep.title.trim(),
        date: newStep.date,
        time,
        location: newStep.location?.trim() || undefined,
        notes: newStep.notes?.trim() || undefined,
      });
    }
    closeAddForm();
    updateGameStats();
  }

  function openEditForm() {
    if (!selectedStep) return;
    editingStepId = selectedStep.id;
    editStep = {
      title: selectedStep.title,
      date: selectedStep.date,
      time: selectedStep.time,
      location: selectedStep.location || "",
      notes: selectedStep.notes || "",
    };
    const [hour, minute] = selectedStep.time.split(":");
    editStepHour = hour;
    editStepMinute = minute;
    showEditForm = true;
  }

  function closeEditForm() {
    showEditForm = false;
    editingStepId = null;
    editStep = { title: "", date: "", time: "", location: "", notes: "" };
  }

  async function handleUpdateStep() {
    if (!editingStepId || !editStep.title.trim() || !editStep.date) {
      alert("Title and date are required");
      return;
    }
    const time = `${editStepHour}:${editStepMinute}`;
    if (onUpdateStep) {
      await onUpdateStep(editingStepId, {
        title: editStep.title.trim(),
        date: editStep.date,
        time,
        location: editStep.location?.trim() || undefined,
        notes: editStep.notes?.trim() || undefined,
      });
    }
    closeEditForm();
    selectedStep = null;
  }

  async function handleDeleteStep() {
    if (!selectedStep) return;
    if (!confirm("Delete this quest?")) return;
    if (onDeleteStep) {
      await onDeleteStep(selectedStep.id);
    }
    selectedStep = null;
    updateGameStats();
  }

  function scrollToDate(date: string) {
    const zone = zones.find((z) => z.date === date);
    if (zone) {
      const mapComponent = document.querySelector(".map-scroll");
      if (mapComponent) {
        mapComponent.scrollTo({ left: zone.startX - 40, behavior: "smooth" });
      }
    }
  }

  function copyShareUrl() {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    showCopyMessage = true;
    setTimeout(() => (showCopyMessage = false), 2000);
  }

  async function attemptEditModeActivation(): Promise<boolean> {
    if (getIsDemoMode()) {
      hasEditPermission = true;
      return true;
    }

    const token = auth.getToken(itinerary.id);
    if (token) {
      const valid = await authApi.verifyToken(itinerary.id);
      if (valid) {
        hasEditPermission = true;
        auth.updateAccessTime(itinerary.id, itinerary.title);
        return true;
      }
    }

    if (!itinerary.is_password_protected) {
      hasEditPermission = true;
      auth.updateAccessTime(itinerary.id, itinerary.title);
      return true;
    }

    showPasswordDialog = true;
    return false;
  }

  async function handleEditButtonClick() {
    if (hasEditPermission) {
      isEditMode = !isEditMode;
      return;
    }

    const activated = await attemptEditModeActivation();
    if (activated) {
      isEditMode = true;
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
      isEditMode = true;
      showPasswordDialog = false;
      password = "";
      auth.updateAccessTime(itinerary.id, itinerary.title);
    } catch (e) {
      alert("パスワードが正しくありません");
    } finally {
      isAuthenticating = false;
    }
  }

  async function handleThemeChange() {
    if (onUpdateItinerary && selectedThemeId !== itinerary.theme_id) {
      let nextMemo = itinerary.memo ?? "";
      try {
        const parsed = JSON.parse(nextMemo);
        if (parsed && typeof parsed === "object") {
          delete parsed.gameData;
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
      } catch {
        // invalid JSON
      }
      await onUpdateItinerary({ theme_id: selectedThemeId, memo: nextMemo });
      goto(`/${itinerary.id}`);
    }
    showThemeDialog = false;
  }
</script>

<div class="pq-container">
  <header class="pq-header">
    <div class="header-left">
      <button
        class="pq-btn-home"
        onclick={() => goto("/")}
        title="Home"
        aria-label="Return to Home"
      >
        <div class="home-icon">
          <div class="home-roof"></div>
          <div class="home-body">
            <div class="home-door"></div>
          </div>
        </div>
      </button>
      <div class="weather-icon weather-{weatherType}"></div>
      {#if isEditingTitle && hasEditPermission}
        <input
          type="text"
          class="pq-title-input"
          bind:value={editedTitle}
          onblur={handleTitleSave}
          onkeydown={(e) => e.key === "Enter" && handleTitleSave()}
        />
      {:else}
        <h1
          class="pq-title"
          ondblclick={() => hasEditPermission && (isEditingTitle = true)}
        >
          {itinerary.title}
        </h1>
      {/if}
      <span class="header-time">{currentTime}</span>
    </div>

    <div class="header-right">
      <div class="pq-actions">
        <button
          class="pq-btn pq-btn-icon"
          onclick={() => (showShareDialog = true)}
          title="Share"
          aria-label="Share"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path
              d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"
            />
          </svg>
        </button>
        {#if hasEditPermission}
          <button
            class="pq-btn pq-btn-icon"
            onclick={() => (showThemeDialog = true)}
            title="Theme"
            aria-label="Theme"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path
                d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"
              />
            </svg>
          </button>
        {/if}
        <button
          class="pq-btn pq-btn-icon"
          onclick={handleEditButtonClick}
          title={hasEditPermission
            ? isEditMode
              ? "Switch to View"
              : "Switch to Edit"
            : "Enter password to edit"}
          aria-label={hasEditPermission
            ? isEditMode
              ? "View Mode"
              : "Edit Mode"
            : "Request Edit"}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path
              d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"
            />
          </svg>
        </button>
        {#if hasEditPermission && isEditMode}
          <button
            class="pq-btn pq-btn-primary pq-btn-small"
            onclick={openAddForm}
          >
            +QUEST
          </button>
        {/if}
      </div>
    </div>
  </header>

  <div class="pq-game-hud">
    <div class="hud-left">
      <div class="adventurer-status">
        <svg class="adventurer-icon" viewBox="0 0 16 16" width="28" height="28">
          <rect x="5" y="0" width="6" height="2" fill="#8b4513" />
          <rect x="4" y="2" width="8" height="2" fill="#8b4513" />
          <rect x="5" y="4" width="6" height="4" fill="#f4c898" />
          <rect x="5" y="5" width="2" height="2" fill="#2c1810" />
          <rect x="9" y="5" width="2" height="2" fill="#2c1810" />
          <rect x="4" y="8" width="8" height="4" fill="#4a90d9" />
          <rect x="3" y="9" width="2" height="3" fill="#f4c898" />
          <rect x="11" y="9" width="2" height="3" fill="#f4c898" />
          <rect x="5" y="12" width="2" height="4" fill="#5b3c11" />
          <rect x="9" y="12" width="2" height="4" fill="#5b3c11" />
        </svg>
        <div class="level-info">
          <div class="level-badge">
            <span class="lv-icon"></span>
            LV {questLevel}
          </div>
          <div class="exp-container">
            <div class="exp-bar">
              <div class="exp-fill" style="width: {questExp}%"></div>
            </div>
            <span class="exp-text">{questExp}/100</span>
          </div>
        </div>
      </div>
    </div>
    <div class="hud-center">
      <div class="day-nav">
        {#each zones as zone, i}
          <button class="day-chip" onclick={() => scrollToDate(zone.date)}>
            DAY{i + 1}
          </button>
        {/each}
      </div>
    </div>
    <div class="hud-right">
      <div class="quest-counter">
        <span class="quest-icon"></span>
        <span>{completedQuests()}/{totalQuests}</span>
      </div>
      <div class="progress-ring">
        <svg viewBox="0 0 36 36">
          <path
            class="progress-bg"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            class="progress-fill"
            stroke-dasharray="{progressPercent}, 100"
            d="M18 2.0845
              a 15.9155 15.9155 0 0 1 0 31.831
              a 15.9155 15.9155 0 0 1 0 -31.831"
          />
        </svg>
        <span class="progress-text">{progressPercent}%</span>
      </div>
    </div>
  </div>

  <main class="pq-main">
    {#if steps.length === 0}
      <div class="pq-empty-state">
        <div class="pq-empty-icon">
          <div class="pq-icon pq-icon-flag" style="transform: scale(3);"></div>
        </div>
        <p class="pq-empty-text">NO QUESTS ON THIS ADVENTURE YET</p>
        <p class="pq-empty-hint">Press +QUEST to begin your journey</p>
        {#if hasEditPermission}
          <button class="pq-btn pq-btn-primary" onclick={openAddForm}>
            + START ADVENTURE
          </button>
        {/if}
      </div>
    {:else}
      <ContinuousMap
        {steps}
        selectedStepId={selectedStep?.id}
        onSelectStep={handleSelectStep}
        {mapHeight}
        {gameData}
        onGameDataChange={handleGameDataChange}
      />
    {/if}
  </main>

  {#if selectedStep}
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div class="detail-overlay" onclick={closeDetailPanel} role="presentation">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="detail-popup"
        onclick={(e) => e.stopPropagation()}
        role="dialog"
        tabindex="-1"
      >
        <button
          class="detail-close"
          onclick={closeDetailPanel}
          aria-label="Close">×</button
        >
        <DetailPanel
          step={selectedStep}
          hasEditPermission={hasEditPermission && isEditMode}
          onEdit={openEditForm}
          onDelete={handleDeleteStep}
        />
      </div>
    </div>
  {/if}

  {#if showLevelUp}
    <div class="level-up-notification">
      <div class="level-up-text">LEVEL UP!</div>
      <div class="level-up-level">LV.{questLevel}</div>
    </div>
  {/if}
</div>

{#if showAddForm}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="pq-form-overlay" onclick={closeAddForm} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="pq-form-dialog"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <h2 class="pq-form-title">NEW QUEST</h2>

      <div class="pq-form-group">
        <span class="pq-form-label">QUEST NAME *</span>
        <input
          type="text"
          class="pq-form-input"
          bind:value={newStep.title}
          placeholder="Enter quest name"
        />
      </div>

      <div class="pq-form-row">
        <div class="pq-form-group">
          <span class="pq-form-label">DATE *</span>
          <input type="date" class="pq-form-input" bind:value={newStep.date} />
        </div>
        <div class="pq-form-group">
          <span class="pq-form-label">TIME</span>
          <div class="pq-form-row">
            <select class="pq-form-select" bind:value={newStepHour}>
              {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as h}
                <option value={h}>{h}</option>
              {/each}
            </select>
            <select class="pq-form-select" bind:value={newStepMinute}>
              {#each ["00", "15", "30", "45"] as m}
                <option value={m}>{m}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>

      <div class="pq-form-group">
        <span class="pq-form-label">LOCATION</span>
        <input
          type="text"
          class="pq-form-input"
          bind:value={newStep.location}
          placeholder="Where is this quest?"
        />
      </div>

      <div class="pq-form-group">
        <span class="pq-form-label">NOTES</span>
        <textarea
          class="pq-form-textarea"
          bind:value={newStep.notes}
          rows="3"
          placeholder="Additional details..."
        ></textarea>
      </div>

      <div class="pq-form-actions">
        <button class="pq-btn" onclick={closeAddForm}>CANCEL</button>
        <button class="pq-btn pq-btn-primary" onclick={handleAddStep}
          >ADD</button
        >
      </div>
    </div>
  </div>
{/if}

{#if showEditForm}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="pq-form-overlay" onclick={closeEditForm} role="presentation">
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="pq-form-dialog"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <h2 class="pq-form-title">EDIT QUEST</h2>

      <div class="pq-form-group">
        <span class="pq-form-label">QUEST NAME *</span>
        <input type="text" class="pq-form-input" bind:value={editStep.title} />
      </div>

      <div class="pq-form-row">
        <div class="pq-form-group">
          <span class="pq-form-label">DATE *</span>
          <input type="date" class="pq-form-input" bind:value={editStep.date} />
        </div>
        <div class="pq-form-group">
          <span class="pq-form-label">TIME</span>
          <div class="pq-form-row">
            <select class="pq-form-select" bind:value={editStepHour}>
              {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as h}
                <option value={h}>{h}</option>
              {/each}
            </select>
            <select class="pq-form-select" bind:value={editStepMinute}>
              {#each ["00", "15", "30", "45"] as m}
                <option value={m}>{m}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>

      <div class="pq-form-group">
        <span class="pq-form-label">LOCATION</span>
        <input
          type="text"
          class="pq-form-input"
          bind:value={editStep.location}
        />
      </div>

      <div class="pq-form-group">
        <span class="pq-form-label">NOTES</span>
        <textarea class="pq-form-textarea" bind:value={editStep.notes} rows="3"
        ></textarea>
      </div>

      <div class="pq-form-actions">
        <button class="pq-btn" onclick={closeEditForm}>CANCEL</button>
        <button class="pq-btn pq-btn-primary" onclick={handleUpdateStep}
          >SAVE</button
        >
      </div>
    </div>
  </div>
{/if}

{#if showShareDialog}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="pq-form-overlay"
    onclick={() => (showShareDialog = false)}
    role="presentation"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="pq-form-dialog pq-share-dialog"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <h2 class="pq-form-title">SHARE ADVENTURE</h2>
      <p class="pq-share-description">Share this URL with your party:</p>
      <div class="pq-share-url">
        {typeof window !== "undefined" ? window.location.href : ""}
      </div>
      <div class="pq-form-actions">
        <button class="pq-btn" onclick={() => (showShareDialog = false)}
          >CLOSE</button
        >
        <button class="pq-btn pq-btn-primary" onclick={copyShareUrl}>
          {showCopyMessage ? "COPIED!" : "COPY"}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showThemeDialog}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="pq-form-overlay"
    onclick={() => (showThemeDialog = false)}
    role="presentation"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="pq-form-dialog"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <h2 class="pq-form-title">SELECT THEME</h2>
      <div class="pq-form-group">
        <select class="pq-form-select" bind:value={selectedThemeId}>
          {#each getAvailableThemes() as theme}
            <option value={theme.id}>{theme.name}</option>
          {/each}
        </select>
      </div>
      <div class="pq-form-actions">
        <button class="pq-btn" onclick={() => (showThemeDialog = false)}
          >CANCEL</button
        >
        <button class="pq-btn pq-btn-primary" onclick={handleThemeChange}
          >APPLY</button
        >
      </div>
    </div>
  </div>
{/if}

{#if showPasswordDialog}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="pq-form-overlay"
    onclick={() => {
      showPasswordDialog = false;
      password = "";
    }}
    role="presentation"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
    <div
      class="pq-form-dialog"
      onclick={(e) => e.stopPropagation()}
      role="dialog"
      tabindex="-1"
    >
      <h2 class="pq-form-title">EDIT PASSWORD</h2>
      <div class="pq-form-group">
        <input
          type="password"
          class="pq-form-input"
          bind:value={password}
          placeholder="Enter password"
          disabled={isAuthenticating}
        />
      </div>
      <div class="pq-form-actions">
        <button
          class="pq-btn"
          onclick={() => {
            showPasswordDialog = false;
            password = "";
          }}
          disabled={isAuthenticating}>CANCEL</button
        >
        <button
          class="pq-btn pq-btn-primary"
          onclick={handlePasswordAuth}
          disabled={isAuthenticating}
          >{isAuthenticating ? "AUTHENTICATING..." : "AUTH"}</button
        >
      </div>
    </div>
  </div>
{/if}

<style>
  .pq-container {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .pq-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    gap: 8px;
    flex-shrink: 0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .pq-btn-home {
    width: 36px;
    height: 36px;
    background: linear-gradient(180deg, #5d8a4a 0%, #4a7a3a 100%);
    border: 3px solid var(--pq-border-outer);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 2px 2px 0 var(--pq-border-outer);
    transition: transform 0.05s steps(1);
    flex-shrink: 0;
    position: relative;
    overflow: hidden;
  }

  .pq-btn-home::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.2) 0%,
      transparent 50%
    );
    pointer-events: none;
  }

  .pq-btn-home:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--pq-border-outer);
  }

  .pq-btn-home:active {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0 var(--pq-border-outer);
  }

  .home-icon {
    position: relative;
    width: 20px;
    height: 18px;
  }

  .home-roof {
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 11px solid transparent;
    border-right: 11px solid transparent;
    border-bottom: 8px solid #c84a2a;
  }

  .home-roof::after {
    content: "";
    position: absolute;
    top: 2px;
    left: -8px;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 5px solid #e85d3b;
  }

  .home-body {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 14px;
    height: 9px;
    background: #d4a853;
    border: 1px solid #a88432;
  }

  .home-door {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 6px;
    background: #6b4423;
    border-radius: 2px 2px 0 0;
  }

  .weather-icon {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  .weather-sunny {
    background: radial-gradient(circle, #ffd700 40%, transparent 40%);
    box-shadow:
      4px 0 0 2px rgba(255, 215, 0, 0.3),
      -4px 0 0 2px rgba(255, 215, 0, 0.3),
      0 4px 0 2px rgba(255, 215, 0, 0.3),
      0 -4px 0 2px rgba(255, 215, 0, 0.3);
    animation: sun-pulse 2s ease-in-out infinite;
  }

  @keyframes sun-pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .weather-cloudy {
    background: radial-gradient(
        ellipse 60% 40% at 30% 60%,
        #ccc 50%,
        transparent 50%
      ),
      radial-gradient(ellipse 50% 40% at 70% 50%, #ddd 50%, transparent 50%);
  }

  .weather-rainy {
    background: radial-gradient(
      ellipse 60% 40% at 50% 30%,
      #888 50%,
      transparent 50%
    );
    position: relative;
  }

  .weather-rainy::after {
    content: "";
    position: absolute;
    bottom: 0;
    left: 4px;
    width: 2px;
    height: 6px;
    background: #5b9bd5;
    box-shadow:
      6px 2px 0 #5b9bd5,
      12px -1px 0 #5b9bd5;
    animation: rain-fall 0.5s linear infinite;
  }

  @keyframes rain-fall {
    0% {
      transform: translateY(0);
      opacity: 1;
    }
    100% {
      transform: translateY(4px);
      opacity: 0;
    }
  }

  .header-time {
    font-size: 0.625rem;
    color: var(--pq-ui-gold);
    font-family: var(--pq-font-pixel);
    background: var(--pq-bg-dark);
    padding: 2px 6px;
    border: 2px solid var(--pq-border-inner);
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pq-game-hud {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    background: var(--pq-bg-dark);
    border-bottom: 3px solid var(--pq-border-outer);
    gap: 8px;
    flex-shrink: 0;
  }

  .hud-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .adventurer-status {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .adventurer-icon {
    image-rendering: pixelated;
    flex-shrink: 0;
    filter: drop-shadow(1px 1px 0 var(--pq-border-outer));
  }

  .level-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .level-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    background: linear-gradient(180deg, #ffd700 0%, #ff8c00 100%);
    color: var(--pq-text-dark);
    font-family: var(--pq-font-pixel);
    font-size: 0.6875rem;
    font-weight: bold;
    padding: 2px 8px;
    border: 2px solid #cc7000;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.4),
      1px 1px 0 var(--pq-border-outer);
    animation: badge-shine 3s ease-in-out infinite;
  }

  @keyframes badge-shine {
    0%,
    100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.15);
    }
  }

  .lv-icon {
    width: 8px;
    height: 8px;
    background: linear-gradient(135deg, #fff 30%, #ffd700 70%);
    clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
  }

  .exp-container {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .exp-bar {
    width: 40px;
    height: 6px;
    background: var(--pq-bg-dark);
    border: 1px solid var(--pq-border-inner);
    position: relative;
    overflow: hidden;
  }

  .exp-fill {
    height: 100%;
    background: linear-gradient(90deg, #4a90d9, #7bb8e8);
    transition: width 0.3s;
  }

  .exp-text {
    font-size: 0.5rem;
    font-family: var(--pq-font-pixel);
    color: var(--pq-text-muted);
    white-space: nowrap;
  }

  .hud-center {
    flex: 1;
    display: flex;
    justify-content: center;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .hud-center::-webkit-scrollbar {
    display: none;
  }

  .day-nav {
    display: flex;
    gap: 4px;
  }

  .day-chip {
    background: var(--pq-bg-medium);
    color: var(--pq-text-secondary);
    border: 2px solid var(--pq-border-inner);
    padding: 2px 8px;
    font-family: var(--pq-font-pixel);
    font-size: 0.5rem;
    cursor: pointer;
    white-space: nowrap;
    box-shadow: 1px 1px 0 var(--pq-border-outer);
    transition: all 0.05s steps(1);
  }

  .day-chip:hover {
    background: var(--pq-ui-gold);
    color: var(--pq-text-dark);
    border-color: var(--pq-ui-gold);
    transform: translateY(-2px);
    box-shadow: 2px 2px 0 var(--pq-border-outer);
  }

  .day-chip:active {
    transform: translateY(0);
    box-shadow: 0 0 0 var(--pq-border-outer);
  }

  .hud-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .quest-counter {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--pq-font-pixel);
    font-size: 0.625rem;
    color: var(--pq-text-primary);
  }

  .quest-icon {
    width: 12px;
    height: 12px;
    background: var(--pq-ui-green);
    clip-path: polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%);
  }

  .progress-ring {
    width: 32px;
    height: 32px;
    position: relative;
  }

  .progress-ring svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .progress-bg {
    fill: none;
    stroke: var(--pq-bg-medium);
    stroke-width: 3;
  }

  .progress-fill {
    fill: none;
    stroke: var(--pq-ui-green);
    stroke-width: 3;
    stroke-linecap: butt;
    transition: stroke-dasharray 0.5s;
  }

  .progress-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.5rem;
    font-family: var(--pq-font-pixel);
    color: var(--pq-text-primary);
  }

  .pq-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .pq-empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px;
    text-align: center;
    gap: 12px;
  }

  .pq-empty-hint {
    font-size: 0.75rem;
    color: var(--pq-text-secondary);
    font-family: var(--pq-font-pixel);
  }

  .detail-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 100;
    padding: 16px;
    animation: fade-in 0.15s ease-out;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .detail-popup {
    background: var(--pq-bg-dark);
    border: 4px solid var(--pq-border-inner);
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.5);
    width: 100%;
    max-width: 500px;
    max-height: 60vh;
    overflow-y: auto;
    position: relative;
    animation: slide-up 0.2s ease-out;
  }

  @keyframes slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .detail-close {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    background: var(--pq-ui-red);
    border: 2px solid var(--pq-border-outer);
    color: var(--pq-text-primary);
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }

  .detail-close:hover {
    background: #c84a2a;
  }

  .level-up-notification {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #ffd700, #ff8c00);
    padding: 32px 56px;
    border: 4px solid #cc7000;
    box-shadow:
      0 0 40px rgba(255, 215, 0, 0.5),
      inset 0 0 20px rgba(255, 255, 255, 0.3);
    text-align: center;
    z-index: 200;
    animation: level-up-anim 2s ease-out forwards;
  }

  .level-up-notification::before,
  .level-up-notification::after {
    content: "★";
    position: absolute;
    font-size: 1.5rem;
    color: #fff;
    text-shadow: 0 0 10px #ffd700;
    animation: star-float 1s ease-out forwards;
  }

  .level-up-notification::before {
    top: 8px;
    left: 12px;
    animation-delay: 0.1s;
  }

  .level-up-notification::after {
    top: 8px;
    right: 12px;
    animation-delay: 0.2s;
  }

  @keyframes star-float {
    0% {
      transform: translateY(0) scale(0);
      opacity: 0;
    }
    50% {
      opacity: 1;
    }
    100% {
      transform: translateY(-20px) scale(1.2);
      opacity: 0;
    }
  }

  @keyframes level-up-anim {
    0% {
      transform: translate(-50%, -50%) scale(0);
      opacity: 0;
    }
    20% {
      transform: translate(-50%, -50%) scale(1.2);
      opacity: 1;
    }
    30% {
      transform: translate(-50%, -50%) scale(1);
    }
    80% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
    100% {
      transform: translate(-50%, -50%) scale(1.5);
      opacity: 0;
    }
  }

  .level-up-text {
    font-family: var(--pq-font-pixel);
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--pq-text-dark);
    text-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
  }

  .level-up-level {
    font-family: var(--pq-font-pixel);
    font-size: 2rem;
    font-weight: bold;
    color: var(--pq-text-dark);
  }

  .pq-share-url {
    background: rgba(0, 0, 0, 0.3);
    padding: 12px;
    border: 2px solid var(--pq-border-inner);
    word-break: break-all;
    font-family: monospace;
    font-size: 0.75rem;
    color: #ffd700;
    text-shadow: 1px 1px 0 #000;
    margin: 12px 0;
  }

  .pq-share-description {
    color: #f4e8d3;
    font-family: var(--pq-font-pixel);
    font-size: 0.75rem;
    margin: 12px 0 8px 0;
    text-shadow: 1px 1px 0 #000;
  }

  @media (min-width: 768px) {
    .pq-header {
      padding: 12px 24px;
    }

    .pq-game-hud {
      padding: 8px 24px;
    }

    .exp-bar {
      width: 100px;
    }

    .detail-popup {
      max-height: 50vh;
    }
  }
</style>
