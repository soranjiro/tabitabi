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
  let password = $state("");
  let isAuthenticating = $state(false);

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
      hasEditPermission = true;
      return;
    }

    showPasswordDialog = true;
  }

  let newStep = $state({
    title: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });

  let newStepHour = $state("09");
  let newStepMinute = $state("00");

  $effect(() => {
    newStep.time = `${newStepHour}:${newStepMinute}`;
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
</script>

<div class="ai-generated-theme">
  <div class="ai-generated-container">
    <nav class="ai-generated-nav">
      <button
        type="button"
        onclick={() => goto("/")}
        class="ai-generated-home-btn"
        title="ホームに戻る"
      >
        ← ホーム
      </button>
    </nav>

    <header class="ai-generated-header">
      <div class="ai-generated-header-content">
        {#if isEditingTitle}
          <input
            type="text"
            bind:value={editedTitle}
            onblur={handleTitleUpdate}
            onkeydown={(e) => e.key === "Enter" && handleTitleUpdate()}
            class="ai-generated-title-input"
          />
        {:else}
          <button
            type="button"
            onclick={() => {
              isEditingTitle = true;
            }}
            class="ai-generated-title-button"
            disabled={!hasEditPermission}
          >
            ✈️ {itinerary.title}
          </button>
        {/if}

        <div class="ai-generated-controls">
          {#if !hasEditPermission}
            <button
              onclick={attemptEditModeActivation}
              class="ai-generated-btn-edit"
            >
              編集
            </button>
          {/if}
          <select
            value={itinerary.theme_id}
            onchange={handleThemeChange}
            class="ai-generated-select"
            disabled={!hasEditPermission}
          >
            {#each themes as theme}
              <option value={theme.id}>{theme.name}</option>
            {/each}
          </select>
        </div>
      </div>
    </header>

    <div class="ai-generated-add-step">
      {#if isAddingStep && hasEditPermission}
        <form
          class="ai-generated-form"
          onsubmit={(e) => {
            e.preventDefault();
            handleAddStep();
          }}
        >
          <h3 class="ai-generated-form-title">✨ 新しい予定を追加</h3>
          <div class="ai-generated-form-grid">
            <input
              type="text"
              bind:value={newStep.title}
              placeholder="予定のタイトル *"
              class="ai-generated-input"
              required
            />
            <div class="ai-generated-datetime">
              <input
                type="date"
                bind:value={newStep.date}
                class="ai-generated-input"
                required
              />
              <div class="ai-generated-time-picker">
                <select
                  bind:value={newStepHour}
                  class="ai-generated-select-time"
                  required
                >
                  {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                    <option value={hour}>{hour}</option>
                  {/each}
                </select>
                <span class="ai-generated-time-separator">:</span>
                <select
                  bind:value={newStepMinute}
                  class="ai-generated-select-time"
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
              placeholder="📍 場所 (任意)"
              class="ai-generated-input"
            />
            <textarea
              bind:value={newStep.notes}
              placeholder="📝 メモ (任意)"
              class="ai-generated-textarea"
              rows="3"
            ></textarea>
          </div>
          <div class="ai-generated-form-actions">
            <button
              type="submit"
              class="ai-generated-btn ai-generated-btn-primary"
            >
              追加する
            </button>
            <button
              type="button"
              onclick={cancelAddStep}
              class="ai-generated-btn ai-generated-btn-secondary"
            >
              キャンセル
            </button>
          </div>
        </form>
      {:else}
        <button
          onclick={() => {
            if (hasEditPermission) {
              isAddingStep = true;
            } else {
              attemptEditModeActivation();
            }
          }}
          class="ai-generated-btn-add"
        >
          <span class="ai-generated-btn-add-icon">＋</span>
          <span>予定を追加</span>
        </button>
      {/if}
    </div>

    <StepList {steps} {onUpdateStep} {onDeleteStep} />
  </div>

  {#if showPasswordDialog}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="ai-generated-dialog-overlay"
      onclick={() => {
        showPasswordDialog = false;
        password = "";
      }}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="ai-generated-dialog" onclick={(e) => e.stopPropagation()}>
        <h3 class="ai-generated-dialog-title">編集パスワード</h3>
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
            class="ai-generated-input"
            disabled={isAuthenticating}
            style="margin-bottom: 1rem;"
          />
          <div class="ai-generated-dialog-actions">
            <button
              type="submit"
              class="ai-generated-btn ai-generated-btn-primary"
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
              class="ai-generated-btn ai-generated-btn-secondary"
              disabled={isAuthenticating}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}
</div>
