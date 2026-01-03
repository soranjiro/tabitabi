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
  let showThemeSelect = $state(false);
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
    sauna_url: "",
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

  async function handleThemeChange(themeId: string) {
    if (themeId === itinerary.theme_id) {
      return;
    }
    showThemeSelect = false;
    if (onUpdateItinerary) {
      await onUpdateItinerary({ theme_id: themeId });
    }
  }

  async function handleAddSauna() {
    if (!newSauna.title.trim()) {
      alert("サウナ施設名を入力してください");
      return;
    }

    if (onCreateStep) {
      try {
        const now = new Date();
        const saunaData: SaunaData = {
          visited: false,
          sauna_url: newSauna.sauna_url.trim() || undefined,
        };

        const stepData = {
          title: newSauna.title.trim(),
          date: now.toISOString().split("T")[0],
          time: now.toTimeString().split(" ")[0].substring(0, 5),
          notes: JSON.stringify({ text: "", ...saunaData }),
        };

        console.log("Creating sauna step:", stepData);
        await onCreateStep(stepData);

        newSauna = {
          title: "",
          sauna_url: "",
        };
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
      sauna_url: "",
    };
    isAddingSauna = false;
  }
</script>

<div class="sauna-rally-container">
  <a class="sauna-home-button" href="/" aria-label="ホーム">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      width="20"
      height="20"
    >
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  </a>

  <header class="sauna-header">
    <div class="header-top">
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
          <button class="theme-button" onclick={() => (showThemeSelect = !showThemeSelect)}>
            テーマ変更
          </button>
        {/if}

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
      onAddSauna={() => (isAddingSauna = true)}
      {onUpdateStep}
      {onDeleteStep}
    />
  </main>
</div>

{#if showThemeSelect}
  <div class="theme-modal-overlay" onclick={() => (showThemeSelect = false)}>
    <div class="theme-modal-content" onclick={(e) => e.stopPropagation()}>
      <h3 class="theme-modal-title">テーマを選択</h3>
      <div class="theme-list">
        {#each themes as theme}
          <button
            class="theme-option"
            class:selected={theme.id === itinerary.theme_id}
            onclick={() => handleThemeChange(theme.id)}
          >
            <span class="theme-name">{theme.name}</span>
            {#if theme.id === itinerary.theme_id}
              <span class="theme-check">✓</span>
            {/if}
          </button>
        {/each}
      </div>
      <button class="theme-modal-close" onclick={() => (showThemeSelect = false)}>
        閉じる
      </button>
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

      <div class="form-group">
        <label for="sauna-url">施設のURL</label>
        <input
          id="sauna-url"
          type="url"
          bind:value={newSauna.sauna_url}
          placeholder="https://sauna-ikitai.com/..."
          class="form-input"
        />
        <p class="form-hint">URLを設定すると、スタンプをクリックしてリンク先に移動できるようになります。</p>
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