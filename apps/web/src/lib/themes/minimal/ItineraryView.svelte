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

<div class="minimal-theme">
  <nav class="minimal-nav">
    <button
      type="button"
      onclick={() => goto("/")}
      class="minimal-home-btn"
      title="ホームに戻る"
    >
      ← ホーム
    </button>
  </nav>

  <header class="minimal-header">
    {#if isEditingTitle}
      <input
        type="text"
        bind:value={editedTitle}
        onblur={handleTitleUpdate}
        onkeydown={(e) => e.key === "Enter" && handleTitleUpdate()}
        class="minimal-title-input"
      />
    {:else}
      <button
        type="button"
        onclick={() => {
          isEditingTitle = true;
        }}
        class="minimal-title-button"
      >
        {itinerary.title}
      </button>
    {/if}

    <div class="minimal-controls">
      <select
        value={itinerary.theme_id}
        onchange={handleThemeChange}
        class="minimal-theme-select"
      >
        {#each themes as theme}
          <option value={theme.id}>{theme.name}</option>
        {/each}
      </select>
    </div>
  </header>

  <div class="minimal-add-step">
    {#if isAddingStep}
      <form
        class="minimal-step-form"
        onsubmit={(e) => {
          e.preventDefault();
          handleAddStep();
        }}
      >
        <input
          type="text"
          bind:value={newStep.title}
          placeholder="予定のタイトル *"
          class="minimal-input"
          required
        />
        <div class="minimal-datetime">
          <input
            type="date"
            bind:value={newStep.date}
            class="minimal-input"
            required
          />
          <div class="minimal-time-picker">
            <select bind:value={newStepHour} class="minimal-select" required>
              {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                <option value={hour}>{hour}</option>
              {/each}
            </select>
            <span class="minimal-time-separator">:</span>
            <select bind:value={newStepMinute} class="minimal-select" required>
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
          class="minimal-input"
        />
        <textarea
          bind:value={newStep.notes}
          placeholder="メモ (任意)"
          class="minimal-textarea"
          rows="3"
        ></textarea>
        <div class="minimal-form-actions">
          <button type="submit" class="minimal-btn minimal-btn-primary"
            >追加</button
          >
          <button
            type="button"
            onclick={cancelAddStep}
            class="minimal-btn minimal-btn-secondary">キャンセル</button
          >
        </div>
      </form>
    {:else}
      <button
        onclick={() => {
          isAddingStep = true;
        }}
        class="minimal-btn minimal-btn-add"
      >
        ＋ 予定を追加
      </button>
    {/if}
  </div>

  <StepList {steps} {onUpdateStep} {onDeleteStep} />
</div>
