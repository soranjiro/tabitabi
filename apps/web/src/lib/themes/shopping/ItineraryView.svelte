<script lang="ts">
  import { goto } from "$app/navigation";
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import { getAvailableThemes } from "$lib/themes";
  import { auth } from "$lib/auth";
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
  let isAddingItem = $state(false);
  let hasEditPermission = $state(false);
  let showPasswordDialog = $state(false);
  let showMemoDialog = $state(false);
  let editedMemo = $state(itinerary.memo || "");
  let password = $state("");
  let isAuthenticating = $state(false);

  function isCompleted(step: Step): boolean {
    return step.notes?.startsWith("Done") ?? false;
  }

  const totalItems = $derived(steps.length);
  const completedItems = $derived(steps.filter((s) => isCompleted(s)).length);
  const storeCount = $derived(new Set(steps.map((s) => s.location || "")).size);
  const progressPercent = $derived(
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
  );

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

    if (!itinerary.is_password_protected) {
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

  let newItem = $state({
    title: "",
    date: new Date().toISOString().split("T")[0],
    time: "10:00",
    location: "",
    notes: "",
  });

  let newItemHour = $state("10");
  let newItemMinute = $state("00");

  $effect(() => {
    newItem.time = `${newItemHour}:${newItemMinute}`;
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

  async function handleAddItem() {
    if (!newItem.title.trim()) {
      alert("買い物アイテムを入力してください");
      return;
    }

    if (onCreateStep) {
      await onCreateStep({
        title: newItem.title.trim(),
        date: newItem.date,
        time: newItem.time,
        location: newItem.location.trim() || undefined,
        notes: newItem.notes.trim() || undefined,
      });

      newItem = {
        title: "",
        date: new Date().toISOString().split("T")[0],
        time: "10:00",
        location: "",
        notes: "",
      };
      newItemHour = "10";
      newItemMinute = "00";
      isAddingItem = false;
    }
  }

  function cancelAddItem() {
    newItem = {
      title: "",
      date: new Date().toISOString().split("T")[0],
      time: "10:00",
      location: "",
      notes: "",
    };
    newItemHour = "10";
    newItemMinute = "00";
    isAddingItem = false;
  }

  async function handleMemoUpdate() {
    if (onUpdateItinerary) {
      await onUpdateItinerary({ memo: editedMemo.trim() || undefined });
    }
    showMemoDialog = false;
  }
</script>

<div class="shopping-theme">
  <nav class="shopping-nav">
    <button
      type="button"
      onclick={() => goto("/")}
      class="shopping-home-btn"
      title="ホームに戻る"
    >
      <svg
        class="shopping-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      ホーム
    </button>
  </nav>

  <header class="shopping-header">
    <div class="shopping-header-top">
      <div class="shopping-header-icon">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
        >
          <path
            d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
          />
        </svg>
      </div>
      <div class="shopping-title-area">
        {#if isEditingTitle}
          <input
            type="text"
            bind:value={editedTitle}
            onblur={handleTitleUpdate}
            onkeydown={(e) => e.key === "Enter" && handleTitleUpdate()}
            class="shopping-title-input"
          />
        {:else}
          <button
            type="button"
            onclick={() => {
              if (hasEditPermission) isEditingTitle = true;
            }}
            class="shopping-title-button"
            disabled={!hasEditPermission}
          >
            {itinerary.title}
          </button>
        {/if}
      </div>
    </div>

    <div class="shopping-progress-section">
      <div class="shopping-progress-bar">
        <div
          class="shopping-progress-fill"
          style="width: {progressPercent}%"
        ></div>
      </div>
      <div class="shopping-progress-text">
        {completedItems} / {totalItems} 完了
      </div>
    </div>

    <div class="shopping-header-controls">
      {#if !hasEditPermission}
        <button onclick={attemptEditModeActivation} class="shopping-header-btn">
          編集モード
        </button>
      {/if}
      <button
        onclick={() => {
          editedMemo = itinerary.memo || "";
          showMemoDialog = true;
        }}
        class="shopping-header-btn"
      >
        メモ
      </button>
      <select
        value={itinerary.theme_id}
        onchange={handleThemeChange}
        class="shopping-theme-select"
        disabled={!hasEditPermission}
      >
        {#each themes as theme}
          <option value={theme.id}>{theme.name}</option>
        {/each}
      </select>
    </div>
  </header>

  <div class="shopping-add-section">
    {#if isAddingItem && hasEditPermission}
      <form
        class="shopping-item-form"
        onsubmit={(e) => {
          e.preventDefault();
          handleAddItem();
        }}
      >
        <div class="shopping-form-header">
          <h3>新しいアイテム</h3>
        </div>
        <div class="shopping-form-field">
          <span class="shopping-label">アイテム名 *</span>
          <input
            type="text"
            bind:value={newItem.title}
            placeholder="例: 牛乳、パン、洗剤..."
            class="shopping-input"
            required
          />
        </div>
        <div class="shopping-form-field">
          <span class="shopping-label">お店</span>
          <input
            type="text"
            bind:value={newItem.location}
            placeholder="例: イオン、コンビニ..."
            class="shopping-input"
          />
        </div>
        <div class="shopping-form-row">
          <div class="shopping-form-field">
            <span class="shopping-label">日付</span>
            <input
              type="date"
              bind:value={newItem.date}
              class="shopping-input"
            />
          </div>
          <div class="shopping-form-field">
            <span class="shopping-label">時刻</span>
            <div class="shopping-time-picker">
              <select bind:value={newItemHour} class="shopping-select">
                {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                  <option value={hour}>{hour}</option>
                {/each}
              </select>
              <span class="shopping-time-separator">:</span>
              <select bind:value={newItemMinute} class="shopping-select">
                <option value="00">00</option>
                <option value="15">15</option>
                <option value="30">30</option>
                <option value="45">45</option>
              </select>
            </div>
          </div>
        </div>
        <div class="shopping-form-field">
          <span class="shopping-label">メモ</span>
          <textarea
            bind:value={newItem.notes}
            placeholder="価格、数量、ブランドなど..."
            class="shopping-textarea"
            rows="2"
          ></textarea>
        </div>
        <div class="shopping-form-actions">
          <button type="submit" class="shopping-btn shopping-btn-primary">
            追加する
          </button>
          <button
            type="button"
            onclick={cancelAddItem}
            class="shopping-btn shopping-btn-ghost"
          >
            キャンセル
          </button>
        </div>
      </form>
    {:else}
      <button
        onclick={() => {
          isAddingItem = true;
        }}
        class="shopping-btn shopping-btn-add"
        disabled={!hasEditPermission}
      >
        <svg
          class="shopping-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        買い物を追加
      </button>
    {/if}
  </div>

  {#if showMemoDialog}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="shopping-dialog-overlay"
      onclick={() => {
        showMemoDialog = false;
      }}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="shopping-dialog" onclick={(e) => e.stopPropagation()}>
        <h3 class="shopping-dialog-title">メモ</h3>
        <textarea
          bind:value={editedMemo}
          rows="6"
          class="shopping-textarea"
          readonly={!hasEditPermission}
          placeholder="買い物リストのメモを入力..."
        ></textarea>
        <div class="shopping-dialog-actions">
          {#if hasEditPermission}
            <button
              onclick={handleMemoUpdate}
              class="shopping-btn shopping-btn-primary"
            >
              保存
            </button>
          {/if}
          <button
            onclick={() => {
              showMemoDialog = false;
            }}
            class="shopping-btn shopping-btn-ghost"
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
      class="shopping-dialog-overlay"
      onclick={() => {
        showPasswordDialog = false;
        password = "";
      }}
    >
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="shopping-dialog" onclick={(e) => e.stopPropagation()}>
        <h3 class="shopping-dialog-title">編集パスワード</h3>
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
            class="shopping-input"
            disabled={isAuthenticating}
          />
          <div class="shopping-dialog-actions">
            <button
              type="submit"
              class="shopping-btn shopping-btn-primary"
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
              class="shopping-btn shopping-btn-ghost"
              disabled={isAuthenticating}
            >
              キャンセル
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <StepList {steps} {onUpdateStep} {onDeleteStep} {hasEditPermission} />
</div>
