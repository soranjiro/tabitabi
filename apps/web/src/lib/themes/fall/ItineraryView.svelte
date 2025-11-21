<script lang="ts">
  import { goto } from "$app/navigation";
  import type { Itinerary, Step } from "@tabitabi/types";
  import { getAvailableThemes } from "$lib/themes";
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

  async function handleShare() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert("リンクをコピーしました！");
    } catch (err) {
      console.error("Failed to copy:", err);
      alert("リンクのコピーに失敗しました");
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
</script>

<div class="fall-theme">
  <div class="fall-container">
    <header class="fall-header">
      <button
        type="button"
        class="fall-share-icon"
        onclick={handleShare}
        aria-label="共有する"
        title="リンクをコピー"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>
      {#if isEditingTitle}
        <input
          type="text"
          bind:value={editedTitle}
          onblur={handleTitleUpdate}
          onkeydown={(e) => e.key === "Enter" && handleTitleUpdate()}
          class="fall-title-input"
        />
      {:else}
        <button
          type="button"
          onclick={() => {
            isEditingTitle = true;
          }}
          class="fall-title-button">{itinerary.title}</button
        >
      {/if}
      <div class="fall-memo">メモ</div>
    </header>

    <div class="fall-add-step">
      {#if isAddingStep}
        <form
          class="fall-form"
          onsubmit={(e) => {
            e.preventDefault();
            handleAddStep();
          }}
        >
          <h3 class="fall-form-title">新しい予定を追加</h3>
          <div class="fall-form-grid">
            <input
              type="text"
              bind:value={newStep.title}
              placeholder="予定のタイトル *"
              class="fall-input"
              required
            />
            <div class="fall-datetime">
              <input
                type="date"
                bind:value={newStep.date}
                class="fall-input"
                required
              />
              <div class="fall-time-picker">
                <select
                  bind:value={newStepHour}
                  class="fall-select-time"
                  required
                >
                  {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                    <option value={hour}>{hour}</option>
                  {/each}
                </select>
                <span class="fall-time-separator">:</span>
                <select
                  bind:value={newStepMinute}
                  class="fall-select-time"
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
              class="fall-input"
            />
            <textarea
              bind:value={newStep.notes}
              placeholder="メモ (任意)"
              class="fall-textarea"
              rows="3"
            ></textarea>
          </div>
          <div class="fall-form-actions">
            <button type="submit" class="fall-btn fall-btn-primary"
              >追加する</button
            >
            <button
              type="button"
              onclick={cancelAddStep}
              class="fall-btn fall-btn-secondary">キャンセル</button
            >
          </div>
        </form>
      {:else}
        <button
          onclick={() => {
            isAddingStep = true;
          }}
          class="fall-btn-add">＋ 予定を追加</button
        >
      {/if}
    </div>

    <StepList {steps} {onUpdateStep} {onDeleteStep} />

    <nav class="fall-bottom-nav" aria-label="フッターメニュー">
      <button
        class="fall-bottom-btn"
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
      <button
        class="fall-bottom-btn"
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
      </button>
      <button class="fall-bottom-btn" title="設定" aria-label="設定">
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
    </nav>
  </div>
</div>
