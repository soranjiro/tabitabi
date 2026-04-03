<script lang="ts">
  import type { StepType } from "@tabitabi/types";
  import { createTimestamp, createEndTimestamp } from "@tabitabi/types";
  import {
    STEP_TYPES_BY_CATEGORY,
    STEP_TYPE_CONFIGS,
  } from "../utils/step-type";

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

  $effect(() => {
    newStep.time = `${newStepHour}:${newStepMinute}`;
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    const startAt = createTimestamp(newStep.date, newStep.time);
    const endAt = createEndTimestamp(startAt);
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
    <div class="standard-autumn-form-field">
      <label for="type-input" class="standard-autumn-form-label"
        >予定の種類</label
      >
      <select
        id="type-input"
        bind:value={newStep.type}
        class="standard-autumn-input"
      >
        <optgroup label="通常の予定">
          {#each STEP_TYPES_BY_CATEGORY.normal as type}
            <option value={type}>
              {STEP_TYPE_CONFIGS[type as StepType].label}
            </option>
          {/each}
        </optgroup>
        <optgroup label="移動">
          {#each STEP_TYPES_BY_CATEGORY.transport as type}
            <option value={type}>
              {STEP_TYPE_CONFIGS[type as StepType].label}
            </option>
          {/each}
        </optgroup>
      </select>
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
