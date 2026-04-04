<script lang="ts">
  import type { StepType } from "@tabitabi/types";
  import { createTimestamp, createEndTimestamp } from "@tabitabi/types";
  import {
    STEP_TYPES_BY_CATEGORY,
    STEP_TYPE_CONFIGS,
  } from "../utils/step-type";
  import TypePicker from "./TypePicker.svelte";

  interface Props {
    newStep: {
      title: string;
      date: string;
      time: string;
      location: string;
      notes: string;
      type?: StepType;
    };
    newStepHour: string;
    newStepMinute: string;
    onSubmit: (data: {
      start_at: number;
      end_at: number;
      type?: StepType;
    }) => void;
    onCancel: () => void;
  }

  let {
    newStep = $bindable(),
    newStepHour = $bindable(),
    newStepMinute = $bindable(),
    onSubmit,
    onCancel,
  }: Props = $props();

  // End time state for the form (allow specifying end time when creating)
  let newStepEndDate = $state(newStep.date || "");
  let newStepEndHour = $state(
    String((parseInt(newStepHour || "09", 10) + 1) % 24).padStart(2, "0"),
  );
  let newStepEndMinute = $state(newStepMinute || "00");
  let startUserChanged = $state(false);
  let endUserChanged = $state(false);
  const DEFAULT_DURATION_MIN = 60;

  $effect(() => {
    newStep.time = `${newStepHour}:${newStepMinute}`;
  });

  $effect(() => {
    // keep end date defaulted to the start date unless user changes it
    if (!newStepEndDate) newStepEndDate = newStep.date;
    if (endUserChanged) return;
    // compute default end from start
    if (!newStep.date || !newStepHour || !newStepMinute) return;
    try {
      const startAt = createTimestamp(
        newStep.date,
        `${newStepHour}:${newStepMinute}`,
      );
      const endAt = createEndTimestamp(startAt, DEFAULT_DURATION_MIN);
      const d = new Date(endAt);
      newStepEndDate = d.toISOString().split("T")[0];
      newStepEndHour = String(d.getHours()).padStart(2, "0");
      newStepEndMinute = String(d.getMinutes()).padStart(2, "0");
    } catch (e) {
      // ignore
    }
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (
      !newStep.title.trim() ||
      !newStep.date ||
      !newStepHour ||
      !newStepMinute
    ) {
      alert("タイトル、日付、時刻は必須です");
      return;
    }

    const startAt = createTimestamp(
      newStep.date,
      `${newStepHour}:${newStepMinute}`,
    );
    const endAt = createTimestamp(
      newStepEndDate || newStep.date,
      `${newStepEndHour}:${newStepEndMinute}`,
    );

    if (endAt <= startAt) {
      alert("終了時刻は開始時刻より後にしてください");
      return;
    }

    onSubmit({ start_at: startAt, end_at: endAt, type: newStep.type });
  }
</script>

<form class="standard-autumn-form" onsubmit={handleSubmit}>
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
        onchange={() => (startUserChanged = true)}
        class="standard-autumn-input"
        required
      />
      <div class="standard-autumn-time-picker">
        <select
          bind:value={newStepHour}
          onchange={() => (startUserChanged = true)}
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
          onchange={() => (startUserChanged = true)}
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
    <div class="standard-autumn-datetime">
      <label class="standard-autumn-form-label">終了日時</label>
      <input
        type="date"
        bind:value={newStepEndDate}
        class="standard-autumn-input"
      />
      <div class="standard-autumn-time-picker">
        <select
          bind:value={newStepEndHour}
          class="standard-autumn-select-time"
          required
          onchange={() => (endUserChanged = true)}
        >
          {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
            <option value={hour}>{hour}</option>
          {/each}
        </select>
        <span class="standard-autumn-time-separator">:</span>
        <select
          bind:value={newStepEndMinute}
          class="standard-autumn-select-time"
          required
          onchange={() => (endUserChanged = true)}
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
    <div class="standard-autumn-form-field">
      <div class="standard-autumn-form-label">予定の種類</div>
      <TypePicker
        value={newStep.type}
        onSelect={(type: StepType) => {
          newStep.type = type;
        }}
      />
    </div>
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
      class="standard-autumn-btn standard-autumn-btn-primary">追加する</button
    >
    <button
      type="button"
      onclick={onCancel}
      class="standard-autumn-btn standard-autumn-btn-secondary"
      >キャンセル</button
    >
  </div>
</form>
