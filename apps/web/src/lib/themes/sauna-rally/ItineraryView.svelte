<script lang="ts">
  import { goto } from "$app/navigation";
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import { getAvailableThemes } from "$lib/themes";
  import { auth } from "$lib/auth";
  import { handlePasswordAuth } from "$lib/auth/handle-password-auth";
  import { getIsDemoMode } from "$lib/demo";
  import { authApi } from "$lib/api/auth";
  import { onMount } from "svelte";
  import StepList from "./StepList.svelte";
  import "./styles/index.css";

  interface Props {
    itinerary: ItineraryResponse;
    steps: Step[];
    onUpdateItinerary?: (data: {
      title?: string;
      theme_id?: string;
      memo?: string;
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
  let isAddingSauna = $state(false);
  let hasEditPermission = $state(false);
  let showPasswordDialog = $state(false);
  let password = $state("");
  let isAuthenticating = $state(false);

  interface SaunaData {
    visited?: boolean;
    visit_date?: string;
    sauna_url?: string;
  }

  function parseSaunaData(notes: string | null | undefined): SaunaData {
    if (!notes) return {};
    try {
      const parsed = JSON.parse(notes);
      if (typeof parsed === "object") return parsed;
    } catch {
      return {};
    }
    return {};
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
    auth.updateAccessTime(itinerary.id, itinerary.title);
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

    if (!itinerary.is_password_protected) {
      hasEditPermission = true;
      auth.updateAccessTime(itinerary.id, itinerary.title);
    } else {
      showPasswordDialog = true;
    }
  }

  let newSauna = $state({
    title: "",
    date: new Date().toISOString().split("T")[0],
    time: "10:00",
    location: "",
  });

  let newSaunaHour = $state("10");
  let newSaunaMinute = $state("00");

  $effect(() => {
    newSauna.time = `${newSaunaHour}:${newSaunaMinute}`;
  });

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

  async function handleThemeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newThemeId = target.value;

    if (newThemeId !== itinerary.theme_id && onUpdateItinerary) {
      await onUpdateItinerary({ theme_id: newThemeId });
    }
  }

  async function handleAddSauna() {
    if (!newSauna.title.trim()) {
      alert("サウナ施設名を入力してください");
      return;
    }

    if (onCreateStep) {
      try {
        const saunaData: SaunaData = {
          visited: false,
        };

        const stepData = {
          title: newSauna.title.trim(),
          date: newSauna.date,
          time: newSauna.time,
          location: newSauna.location.trim() || undefined,
          notes: JSON.stringify({ text: "", ...saunaData }),
        };

        console.log("Creating sauna step:", stepData);
        await onCreateStep(stepData);

        newSauna = {
          title: "",
          date: new Date().toISOString().split("T")[0],
          time: "10:00",
          location: "",
        };
        newSaunaHour = "10";
        newSaunaMinute = "00";
        isAddingSauna = false;
      } catch (error) {
        console.error("サウナ追加エラー:", error);
        alert("サウナの追加に失敗しました。もう一度お試しください。");
      }
    }
  }

  function cancelAddSauna() {
    newSauna = {
      title: "",
      date: new Date().toISOString().split("T")[0],
      time: "10:00",
      location: "",
      notes: "",
    };
    newSaunaHour = "10";
    newSaunaMinute = "00";
    isAddingSauna = false;
  }

  function goBack() {
    goto("/itineraries");
  }
</script>

<div class="sauna-rally-container">
  <header class="sauna-header">
    <div class="header-top">
      <button class="back-button" onclick={goBack}>
        <span class="back-icon">←</span>
      </button>

      {#if isEditingTitle}
        <input
          type="text"
          bind:value={editedTitle}
          onblur={handleTitleUpdate}
          onkeydown={(e) => e.key === "Enter" && handleTitleUpdate()}
          class="title-input"
          placeholder="サウナ旅のタイトル"
        />
      {:else}
        <h1 class="rally-title" onclick={() => hasEditPermission && (isEditingTitle = true)}>
          {itinerary.title}
        </h1>
      {/if}

      <div class="header-actions">
        {#if hasEditPermission}
          <button class="add-sauna-button-header" onclick={() => (isAddingSauna = true)}>
            + サウナ追加
          </button>
        {/if}

        <label class="theme-selector">
          <select onchange={handleThemeChange} value={itinerary.theme_id} disabled={!hasEditPermission}>
            {#each themes as theme}
              <option value={theme.id}>{theme.name}</option>
            {/each}
          </select>
        </label>

        {#if !hasEditPermission}
          <button class="edit-button" onclick={attemptEditModeActivation}>
            編集モード
          </button>
        {/if}
      </div>
    </div>
  </header>

  <main class="sauna-content">
    <StepList
      {steps}
      {hasEditPermission}
      {onUpdateStep}
      {onDeleteStep}
    />
  </main>
</div>

{#if showPasswordDialog}
  <div class="modal-overlay" onclick={() => (showPasswordDialog = false)}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <h2>パスワード入力</h2>
      <p>このしおりを編集するにはパスワードが必要です</p>
      <input
        type="password"
        bind:value={password}
        placeholder="パスワード"
        class="password-input"
        onkeydown={(e) => e.key === "Enter" && onPasswordAuth()}
      />
      <div class="modal-actions">
        <button
          class="button-secondary"
          onclick={() => (showPasswordDialog = false)}
        >
          キャンセル
        </button>
        <button
          class="button-primary"
          onclick={onPasswordAuth}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? "確認中..." : "確認"}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if isAddingSauna}
  <div class="modal-overlay" onclick={() => (isAddingSauna = false)}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <h2 class="modal-title">🔥 サウナを追加</h2>

      <div class="reference-info">
        <span>施設を探す: </span>
        <a href="https://sauna-ikitai.com/" target="_blank" rel="noopener noreferrer" class="ikitai-link-small">
          サウナイキタイ →
        </a>
      </div>

      <div class="form-group">
        <label for="sauna-name">施設名 *</label>
        <input
          id="sauna-name"
          type="text"
          bind:value={newSauna.title}
          placeholder="例: サウナしきじ"
          class="form-input"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="sauna-date">訪問予定日 *</label>
          <input
            id="sauna-date"
            type="date"
            bind:value={newSauna.date}
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="sauna-time">時間 *</label>
          <div class="time-inputs">
            <input
              type="number"
              bind:value={newSaunaHour}
              min="0"
              max="23"
              class="time-input"
            />
            <span class="time-separator">:</span>
            <input
              type="number"
              bind:value={newSaunaMinute}
              min="0"
              max="59"
              class="time-input"
            />
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="sauna-location">都道府県・エリア</label>
        <input
          id="sauna-location"
          type="text"
          bind:value={newSauna.location}
          placeholder="例: 静岡県"
          class="form-input"
        />
      </div>

      <div class="modal-actions">
        <button class="button-secondary" onclick={cancelAddSauna}>
          キャンセル
        </button>
        <button class="button-primary" onclick={handleAddSauna}>
          追加する
        </button>
      </div>
    </div>
  </div>
{/if}

{#if showPasswordDialog}
  <div class="modal-overlay" onclick={() => (showPasswordDialog = false)}>
    <div class="modal-content" onclick={(e) => e.stopPropagation()}>
      <h2>パスワード入力</h2>
      <p>このしおりを編集するにはパスワードが必要です</p>
      <input
        type="password"
        bind:value={password}
        placeholder="パスワード"
        class="password-input"
        onkeydown={(e) => e.key === "Enter" && onPasswordAuth()}
      />
      <div class="modal-actions">
        <button
          class="button-secondary"
          onclick={() => (showPasswordDialog = false)}
        >
          キャンセル
        </button>
        <button
          class="button-primary"
          onclick={onPasswordAuth}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? "確認中..." : "確認"}
        </button>
      </div>
    </div>
  </div>
{/if} 