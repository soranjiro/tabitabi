<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getMemoText, updateMemoText } from "$lib/memo";

  interface Props {
    steps: Step[];
    hasEditPermission?: boolean;
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
    steps,
    hasEditPermission = false,
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();

  let viewMode = $state<"timeline" | "month" | "week">("timeline");
  let editingStepId = $state<string | null>(null);
  let editedStep = $state<Partial<Step>>({});
  let editStepHour = $state("09");
  let editStepMinute = $state("00");
  let selectedDate = $state<string | null>(null);

  $effect(() => {
    if (editingStepId && editStepHour && editStepMinute) {
      editedStep.time = `${editStepHour}:${editStepMinute}`;
    }
  });

  const groupedSteps = $derived(() => {
    const groups = new Map<string, Step[]>();
    for (const step of steps) {
      const date = step.date;
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(step);
    }

    for (const [_, groupSteps] of groups) {
      groupSteps.sort((a, b) => a.time.localeCompare(b.time));
    }

    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  });

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    });
  }

  function formatDateFull(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  }

  function formatTime(timeStr: string): string {
    return timeStr;
  }

  function startEdit(step: Step) {
    editingStepId = step.id;
    editedStep = { ...step, notes: getMemoText(step.notes) };
    const [hour, minute] = step.time.split(":");
    editStepHour = hour;
    editStepMinute = minute;
  }

  function cancelEdit() {
    editingStepId = null;
    editedStep = {};
    editStepHour = "09";
    editStepMinute = "00";
  }

  async function handleUpdate() {
    if (
      !editingStepId ||
      !editedStep.title?.trim() ||
      !editedStep.date ||
      !editedStep.time
    ) {
      alert("タイトル、日付、時刻は必須です");
      return;
    }

    const originalStep = steps.find((s) => s.id === editingStepId);
    const noteText = (editedStep.notes ?? "").trim();
    const notes = updateMemoText(originalStep?.notes, noteText);

    if (onUpdateStep) {
      await onUpdateStep(editingStepId, {
        title: editedStep.title.trim(),
        date: editedStep.date,
        time: editedStep.time,
        location: editedStep.location?.trim() || undefined,
        notes,
      });
    }

    editingStepId = null;
    editedStep = {};
    editStepHour = "09";
    editStepMinute = "00";
  }

  async function handleDelete(stepId: string) {
    if (!confirm("この予定を削除しますか?")) return;
    if (onDeleteStep) {
      await onDeleteStep(stepId);
    }
  }

  function getDatesInMonth(year: number, month: number): Date[] {
    const dates: Date[] = [];
    const date = new Date(year, month, 1);
    while (date.getMonth() === month) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return dates;
  }

  function getWeekNumber(date: Date): number {
    const first = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - first.getTime()) / 864e5);
    return Math.ceil((days + first.getDay() + 1) / 7);
  }

  function stepHasSteps(dateStr: string): boolean {
    return groups.some(([date]) => date === dateStr);
  }

  $effect(() => {
    if (steps.length > 0 && !selectedDate) {
      const today = new Date().toISOString().split("T")[0];
      const hasToday = groupedSteps().some(([date]) => date === today);
      selectedDate = hasToday ? today : groupedSteps()[0]?.[0] || null;
    }
  });

  const groups = $derived(groupedSteps());
</script>

<div class="sc-container">
  <!-- View Mode Selector -->
  <div class="view-mode-selector">
    <button
      class="view-btn"
      class:active={viewMode === "timeline"}
      onclick={() => (viewMode = "timeline")}
    >
      リスト
    </button>
    <button
      class="view-btn"
      class:active={viewMode === "week"}
      onclick={() => (viewMode = "week")}
    >
      週
    </button>
    <button
      class="view-btn"
      class:active={viewMode === "month"}
      onclick={() => (viewMode = "month")}
    >
      月
    </button>
  </div>

  <!-- Timeline View (Default) -->
  {#if viewMode === "timeline"}
    <div class="timeline-view">
      {#if groups.length === 0}
        <div class="empty-state">
          <p>予定を追加してください</p>
        </div>
      {:else}
        {#each groups as [date, dateSteps] (date)}
          <div class="date-section">
            <div class="date-header">
              <span class="date-label">{formatDateFull(date)}</span>
              <span class="step-count">{dateSteps.length}件</span>
            </div>
            <div class="steps-group">
              {#each dateSteps as step (step.id)}
                {#if editingStepId === step.id}
                  <!-- Edit Mode -->
                  <div class="step-edit-container">
                    <div class="form-group">
                      <label>タイトル</label>
                      <input
                        type="text"
                        bind:value={editedStep.title}
                        placeholder="タイトルを入力"
                      />
                    </div>
                    <div class="form-row">
                      <div class="form-group">
                        <label>時刻</label>
                        <div class="time-input">
                          <input
                            type="text"
                            bind:value={editStepHour}
                            maxlength="2"
                            placeholder="09"
                          />
                          <span>:</span>
                          <input
                            type="text"
                            bind:value={editStepMinute}
                            maxlength="2"
                            placeholder="00"
                          />
                        </div>
                      </div>
                    </div>
                    <div class="form-group">
                      <label>場所</label>
                      <input
                        type="text"
                        bind:value={editedStep.location}
                        placeholder="場所（オプション）"
                      />
                    </div>
                    <div class="form-group">
                      <label>メモ</label>
                      <textarea
                        bind:value={editedStep.notes}
                        placeholder="メモを入力"
                      ></textarea>
                    </div>
                    <div class="form-actions">
                      <button class="btn-primary" onclick={handleUpdate}
                        >保存</button
                      >
                      <button class="btn-secondary" onclick={cancelEdit}
                        >キャンセル</button
                      >
                    </div>
                  </div>
                {:else}
                  <!-- Display Mode -->
                  <div class="step-item">
                    <div class="step-time">{formatTime(step.time)}</div>
                    <div class="step-content">
                      <h3 class="step-title">{step.title}</h3>
                      {#if step.location}
                        <div class="step-location">📍 {step.location}</div>
                      {/if}
                      {#if step.notes}
                        <div class="step-notes">
                          {getMemoText(step.notes)}
                        </div>
                      {/if}
                    </div>
                    {#if hasEditPermission}
                      <div class="step-actions">
                        <button
                          class="btn-edit"
                          title="編集"
                          onclick={() => startEdit(step)}
                        >
                          ✏️
                        </button>
                        <button
                          class="btn-delete"
                          title="削除"
                          onclick={() => handleDelete(step.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    {/if}
                  </div>
                {/if}
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  {/if}

  {#if viewMode === "week"}
    <div class="week-view">
      {#if groups.length === 0}
        <div class="empty-state">
          <p>予定を追加してください</p>
        </div>
      {:else}
        <div class="week-grid">
          {#each ["月", "火", "水", "木", "金", "土", "日"] as dayName (dayName)}
            <div class="week-header">{dayName}</div>
          {/each}
          {#each groups as [date, dateSteps] (date)}
            {@const dateObj = new Date(date)}
            <div class="week-cell">
              <div class="week-date">{dateObj.getDate()}</div>
              <div class="week-steps">
                {#each dateSteps as step (step.id)}
                  <div class="week-step-item" title={step.title}>
                    <span class="week-step-time">{step.time}</span>
                    <span class="week-step-title"
                      >{step.title.substring(0, 10)}</span
                    >
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if viewMode === "month"}
    <div class="month-view">
      {#if groups.length === 0}
        <div class="empty-state">
          <p>予定を追加してください</p>
        </div>
      {:else}
        {@const firstDate = new Date(groups[0][0])}
        {@const lastDate = new Date(groups[groups.length - 1][0])}
        {@const year = firstDate.getFullYear()}
        {@const month = firstDate.getMonth()}
        {@const daysInMonth = getDatesInMonth(year, month)}
        <div class="month-header">
          {year}年{month + 1}月
        </div>
        <div class="month-weekdays">
          {#each ["日", "月", "火", "水", "木", "金", "土"] as dayName (dayName)}
            <div class="month-weekday">{dayName}</div>
          {/each}
        </div>
        <div class="month-grid">
          {#each daysInMonth as date (date.toISOString().split("T")[0])}
            {@const dateStr = date.toISOString().split("T")[0]}
            {@const daySteps = groups.find(([d]) => d === dateStr)?.[1] || []}
            <div class="month-cell" class:has-steps={daySteps.length > 0}>
              <div class="month-date">{date.getDate()}</div>
              <div class="month-cell-steps">
                {#each daySteps.slice(0, 2) as step (step.id)}
                  <div class="month-step-item" title={step.title}>
                    {step.time}
                  </div>
                {/each}
                {#if daySteps.length > 2}
                  <div class="month-step-more">+{daySteps.length - 2}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .sc-container {
    width: 100%;
    max-width: 600px;
    margin: 0 auto;
    padding: 0;
  }

  .view-mode-selector {
    display: flex;
    gap: 8px;
    padding: 12px;
    background: #f5f5f5;
    border-bottom: 1px solid #e5e5e5;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .view-btn {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #d0d0d0;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #666;
    transition: all 0.2s;
  }

  .view-btn:hover {
    border-color: #2563eb;
    color: #2563eb;
  }

  .view-btn.active {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .timeline-view {
    padding: 16px;
  }

  .empty-state {
    text-align: center;
    padding: 48px 24px;
    color: #999;
    font-size: 14px;
  }

  .date-section {
    margin-bottom: 24px;
  }

  .date-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 12px;
    margin-bottom: 8px;
    background: #f9f9f9;
    border-left: 3px solid #2563eb;
    border-radius: 4px;
  }

  .date-label {
    font-weight: 600;
    color: #1f2937;
    font-size: 14px;
  }

  .step-count {
    font-size: 12px;
    color: #999;
    background: #e5e7eb;
    padding: 2px 8px;
    border-radius: 12px;
  }

  .steps-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .step-item {
    display: flex;
    gap: 12px;
    padding: 12px;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    background: white;
    transition: all 0.2s;
  }

  .step-item:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-color: #d0d0d0;
  }

  .step-time {
    min-width: 50px;
    font-weight: 600;
    color: #2563eb;
    font-size: 13px;
    padding-top: 2px;
  }

  .step-content {
    flex: 1;
    min-width: 0;
  }

  .step-title {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #1f2937;
    word-break: break-word;
  }

  .step-location {
    margin-top: 4px;
    font-size: 12px;
    color: #666;
  }

  .step-notes {
    margin-top: 8px;
    font-size: 12px;
    color: #999;
    line-height: 1.4;
    word-break: break-word;
  }

  .step-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
  }

  .btn-edit,
  .btn-delete {
    padding: 6px 8px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .btn-edit:hover {
    background: #f0f0f0;
  }

  .btn-delete:hover {
    background: #fee;
  }

  .step-edit-container {
    padding: 16px;
    border: 2px solid #2563eb;
    border-radius: 8px;
    background: #f9fbff;
    margin-bottom: 12px;
  }

  .form-group {
    margin-bottom: 12px;
  }

  .form-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .form-group input,
  .form-group textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
  }

  .form-group textarea {
    min-height: 60px;
    resize: vertical;
  }

  .form-group input:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.1);
  }

  .time-input {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .time-input input {
    width: 50px;
    text-align: center;
  }

  .form-row {
    display: flex;
    gap: 12px;
  }

  .form-row .form-group {
    flex: 1;
  }

  .form-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  .btn-primary,
  .btn-secondary {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover {
    background: #1d4ed8;
  }

  .btn-secondary {
    background: white;
    color: #666;
    border: 1px solid #d0d0d0;
  }

  .btn-secondary:hover {
    border-color: #666;
    color: #333;
  }

  .week-view {
    padding: 16px;
  }

  .week-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
  }

  .week-header {
    text-align: center;
    font-weight: 600;
    color: #1f2937;
    padding: 8px 4px;
    font-size: 12px;
  }

  .week-cell {
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 8px;
    background: white;
    min-height: 100px;
    display: flex;
    flex-direction: column;
  }

  .week-date {
    font-weight: 600;
    color: #1f2937;
    font-size: 13px;
    margin-bottom: 6px;
  }

  .week-steps {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
    font-size: 10px;
  }

  .week-step-item {
    padding: 2px 4px;
    background: #f0f4ff;
    color: #2563eb;
    border-radius: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .week-step-time {
    font-weight: 600;
    display: inline;
  }

  .week-step-title {
    margin-left: 2px;
  }

  .month-view {
    padding: 16px;
  }

  .month-header {
    text-align: center;
    font-size: 18px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 16px;
  }

  .month-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
    margin-bottom: 8px;
  }

  .month-weekday {
    text-align: center;
    font-weight: 600;
    color: #1f2937;
    font-size: 12px;
    padding: 8px 0;
  }

  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .month-cell {
    border: 1px solid #e5e5e5;
    border-radius: 6px;
    padding: 8px;
    background: white;
    min-height: 90px;
    display: flex;
    flex-direction: column;
  }

  .month-cell.has-steps {
    background: #f9fbff;
    border-color: #d0e1ff;
  }

  .month-date {
    font-weight: 600;
    color: #1f2937;
    font-size: 13px;
    margin-bottom: 4px;
  }

  .month-cell-steps {
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 10px;
  }

  .month-step-item {
    padding: 2px 4px;
    background: #2563eb;
    color: white;
    border-radius: 3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .month-step-more {
    padding: 2px 4px;
    color: #2563eb;
    font-weight: 600;
  }
</style>
