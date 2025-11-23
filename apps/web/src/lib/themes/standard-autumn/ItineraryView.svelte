<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Itinerary, Step } from "@tabitabi/types";
  import { getAvailableThemes } from "$lib/themes";
  import { auth } from "$lib/auth";
  import { authApi } from "$lib/api/auth";
  import { onMount } from "svelte";
  import StepList from "./StepList.svelte";
  import "./theme.css";

  interface Props {
    itinerary: Itinerary;
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
  let isAddingStep = $state(false);
  let showCopyMessage = $state(false);
  let showShareDialog = $state(false);
  let hasEditPermission = $state(false);
  let showPasswordDialog = $state(false);
  let showMemoDialog = $state(false);
  let editedMemo = $state(itinerary.memo || "");
  let password = $state("");
  let isAuthenticating = $state(false);

  let showThemeSelect = $state(false);
  let showSettingsMenu = $state(false);
  let selectedThemeId = $state(itinerary.theme_id || "standard-autumn");

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

  $effect(() => {
    newStep.time = `${newStepHour}:${newStepMinute}`;
  });

  function getFocusedDate(): string | null {
    return focusedDate;
  }

  function setFocusedDate(date: string | null) {
    focusedDate = date;
  }

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
    auth.updateAccessTime(itinerary.id, itinerary.title);
  });

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
      showSettingsMenu = false;
      password = "";
    } catch (error) {
      alert("パスワードが正しくありません");
    } finally {
      isAuthenticating = false;
    }
  }

  function handleEditModeToggle() {
    if (hasEditPermission) {
      hasEditPermission = false;
      showSettingsMenu = false;
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
        showSettingsMenu = false;
        return;
      }
    }

    // パスワードが設定されていない場合は即座に編集モードに切り替え
    if (!itinerary.password) {
      hasEditPermission = true;
      showSettingsMenu = false;
      return;
    }

    showPasswordDialog = true;
    showSettingsMenu = false;
  }

  async function handleMemoUpdate() {
    if (onUpdateItinerary) {
      await onUpdateItinerary({ memo: editedMemo.trim() || undefined });
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

  async function handleThemeChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    const themeId = target.value;

    if (themeId === itinerary.theme_id) {
      showThemeSelect = false;
      return;
    }

    selectedThemeId = themeId;
    showThemeSelect = false;

    if (onUpdateItinerary) {
      await onUpdateItinerary({ theme_id: themeId });
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
        <!-- Link Icon -->
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
          />
          <path
            d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
          />
        </svg>
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
            onclick={() => {
              if (hasEditPermission) {
                editedMemo = itinerary.memo || "";
                showMemoDialog = true;
              }
            }}
          >
            {itinerary.memo}
          </div>
        {:else if hasEditPermission}
          <button
            onclick={() => {
              editedMemo = "";
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
          <form
            class="standard-autumn-form"
            onsubmit={(e) => {
              e.preventDefault();
              handleAddStep();
            }}
          >
            <h3 class="standard-autumn-form-title">新しい予定を追加</h3>
            <div class="standard-autumn-form-grid">
              <input
                type="text"
                bind:value={newStep.title}
                placeholder="予定のタイトル *"
                class="standard-autumn-input"
                required
              />
              <div class="standard-autumn-datetime">
                <input
                  type="date"
                  bind:value={newStep.date}
                  class="standard-autumn-input"
                  required
                />
                <div class="standard-autumn-time-picker">
                  <select
                    bind:value={newStepHour}
                    class="standard-autumn-select-time"
                    required
                  >
                    {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                      <option value={hour}>{hour}</option>
                    {/each}
                  </select>
                  <span class="standard-autumn-time-separator">:</span>
                  <select
                    bind:value={newStepMinute}
                    class="standard-autumn-select-time"
                    required
                  >
                    <option value="00">00</option>
                    <option value="15">15</option>
                    <option value="30">30</option>
                    <option value="45">45</option>
                  </select>
                </div>
              </div>
              <input
                type="text"
                bind:value={newStep.location}
                placeholder="場所 (任意)"
                class="standard-autumn-input"
              />
              <textarea
                bind:value={newStep.notes}
                placeholder="メモ (任意)"
                class="standard-autumn-textarea"
                rows="3"
              ></textarea>
            </div>
            <div class="standard-autumn-form-actions">
              <button
                type="submit"
                class="standard-autumn-btn standard-autumn-btn-primary"
                >追加する</button
              >
              <button
                type="button"
                onclick={cancelAddStep}
                class="standard-autumn-btn standard-autumn-btn-secondary"
                >キャンセル</button
              >
            </div>
          </form>
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

    <nav class="standard-autumn-bottom-nav" aria-label="フッターメニュー">
      <button
        class="standard-autumn-bottom-btn"
        title="ホーム"
        aria-label="ホーム"
        onclick={() => goto("/")}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        </svg>
        <span>Home</span>
      </button>
      <!-- <button
        class="standard-autumn-bottom-btn"
        title="カレンダー"
        aria-label="カレンダー"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"
          />
        </svg>
        <span>Calendar</span>
      </button> -->

      <div style="position: relative;">
        <button
          class="standard-autumn-bottom-btn"
          title={hasEditPermission
            ? "閲覧モードに切り替え"
            : "編集モードに切り替え"}
          aria-label={hasEditPermission
            ? "閲覧モードに切り替え"
            : "編集モードに切り替え"}
          onclick={handleEditModeToggle}
        >
          {#if hasEditPermission}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
              />
            </svg>
            <span>View</span>
          {:else}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
              />
            </svg>
            <span>Edit</span>
          {/if}
        </button>
      </div>
      {#if hasEditPermission}
        <div style="position: relative;">
          <button
            class="standard-autumn-bottom-btn"
            title="設定"
            aria-label="設定"
            onclick={() => {
              showSettingsMenu = !showSettingsMenu;
              showThemeSelect = false;
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path
                d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94L14.4 2.81c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
              />
            </svg>
            <span>Settings</span>
          </button>
          {#if showSettingsMenu}
            <div class="standard-autumn-settings-menu">
              <button
                onclick={() => {
                  showThemeSelect = true;
                  showSettingsMenu = false;
                }}
                class="standard-autumn-settings-item"
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
                テーマを変更
              </button>
            </div>
          {/if}
          {#if showThemeSelect}
            <div
              style="position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); background: var(--standard-autumn-card-bg); border: 1px solid var(--standard-autumn-border); border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 0.5rem 1rem; z-index: 200; min-width: 180px; max-width: calc(100vw - 2rem); margin-bottom: 0.5rem;"
            >
              <label
                for="theme-select"
                style="font-size: 0.95rem; color: var(--standard-autumn-text); margin-bottom: 0.5rem; display: block;"
                >テーマを選択</label
              >
              <select
                id="theme-select"
                value={selectedThemeId}
                onchange={handleThemeChange}
                style="width: 100%; font-size: 1rem; padding: 0.3rem; border-radius: 4px; border: 1px solid var(--standard-autumn-border); background: #fff; color: var(--standard-autumn-text);"
              >
                {#each themes as theme}
                  <option value={theme.id}>{theme.name}</option>
                {/each}
              </select>
            </div>
          {/if}
        </div>
      {/if}
    </nav>
  </div>

  {#if showMemoDialog}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="standard-autumn-dialog-overlay"
      onclick={() => {
        showMemoDialog = false;
        editedMemo = "";
      }}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="standard-autumn-dialog" onclick={(e) => e.stopPropagation()}>
        <h3 class="standard-autumn-dialog-title">メモ</h3>
        <textarea
          bind:value={editedMemo}
          placeholder="メモを入力..."
          class="standard-autumn-textarea"
          rows="6"
          disabled={!hasEditPermission}
        ></textarea>
        <div class="standard-autumn-dialog-actions">
          {#if hasEditPermission}
            <button
              onclick={handleMemoUpdate}
              class="standard-autumn-btn standard-autumn-btn-primary"
            >
              保存
            </button>
          {/if}
          <button
            onclick={() => {
              showMemoDialog = false;
              editedMemo = "";
            }}
            class="standard-autumn-btn standard-autumn-btn-secondary"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  {/if}

  {#if showPasswordDialog}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="standard-autumn-dialog-overlay"
      onclick={() => {
        showPasswordDialog = false;
        password = "";
      }}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="standard-autumn-dialog" onclick={(e) => e.stopPropagation()}>
        <h3 class="standard-autumn-dialog-title">編集パスワード</h3>
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
            class="standard-autumn-input"
            disabled={isAuthenticating}
          />
          <div class="standard-autumn-dialog-actions">
            <button
              type="submit"
              class="standard-autumn-btn standard-autumn-btn-primary"
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
              class="standard-autumn-btn standard-autumn-btn-secondary"
              disabled={isAuthenticating}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  {#if showShareDialog}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="standard-autumn-dialog-overlay"
      onclick={() => {
        showShareDialog = false;
      }}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="standard-autumn-dialog" onclick={(e) => e.stopPropagation()}>
        <h3 class="standard-autumn-dialog-title">リンクを共有</h3>
        <p class="standard-autumn-dialog-description">
          どのリンクをコピーしますか?
        </p>
        <div class="standard-autumn-share-options">
          <button
            onclick={() => copyShareLink(false)}
            class="standard-autumn-share-option"
          >
            <div class="standard-autumn-share-option-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                width="24"
                height="24"
              >
                <path
                  d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                />
              </svg>
            </div>
            <div class="standard-autumn-share-option-content">
              <div class="standard-autumn-share-option-title">閲覧用リンク</div>
              <div class="standard-autumn-share-option-desc">
                閲覧のみ可能なリンクをコピー
              </div>
            </div>
          </button>
          {#if hasEditPermission}
            <button
              onclick={() => copyShareLink(true)}
              class="standard-autumn-share-option"
            >
              <div class="standard-autumn-share-option-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="24"
                  height="24"
                >
                  <path
                    d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                  />
                </svg>
              </div>
              <div class="standard-autumn-share-option-content">
                <div class="standard-autumn-share-option-title">
                  編集用リンク
                </div>
                <div class="standard-autumn-share-option-desc">
                  誰でも編集できるリンクをコピー
                </div>
              </div>
            </button>
          {/if}
        </div>
        <button
          onclick={() => {
            showShareDialog = false;
          }}
          class="standard-autumn-btn standard-autumn-btn-secondary"
          style="width: 100%; margin-top: 0.5rem;"
        >
          キャンセル
        </button>
      </div>
    </div>
  {/if}
</div>
