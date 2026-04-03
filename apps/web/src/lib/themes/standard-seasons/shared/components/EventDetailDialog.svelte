<script lang="ts">
  import type { Step, StepType } from "@tabitabi/types";
  import {
    getStepDate,
    getStepTime,
    getStepEndTime,
    createTimestamp,
    createEndTimestamp,
  } from "@tabitabi/types";
  import { renderMarkdown } from "../utils/markdown";
  import { getMemoText, updateMemoText } from "$lib/memo";
  import {
    getStepTypeIcon,
    STEP_TYPES_BY_CATEGORY,
    STEP_TYPE_CONFIGS,
  } from "../utils/step-type";

  interface Props {
    step: Step;
    hasEditPermission?: boolean;
    secretModeEnabled?: boolean;
    secretModeOffset?: number;
    onClose: () => void;
    onUpdateStep?: (
      stepId: string,
      data: {
        title?: string;
        start_at?: number;
        end_at?: number;
        location?: string;
        notes?: string;
        type?: StepType;
      },
    ) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
  }

  let {
    step,
    hasEditPermission = false,
    secretModeEnabled = false,
    secretModeOffset = 60,
    onClose,
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();

  function isSecretStep(step: Step): boolean {
    if (!secretModeEnabled) return false;
    const now = Date.now();
    const revealTime = step.start_at - secretModeOffset * 60 * 1000;
    return now < revealTime;
  }

  let isEditing = $state(false);
  let editedStep = $state<{
    title?: string;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    location?: string | null;
    notes?: string;
    type?: StepType;
  }>({});
  let editStartHour = $state(getStepTime(step).split(":")[0]);
  let editStartMinute = $state(getStepTime(step).split(":")[1]);
  let editEndHour = $state("10");
  let editEndMinute = $state("00");

  function formatTime(ms: number): [string, string] {
    const date = new Date(ms);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return [hours, minutes];
  }

  function formatDate(ms: number): string {
    const date = new Date(ms);
    return date.toISOString().split("T")[0];
  }

  function startEdit() {
    isEditing = true;
    const [startHour, startMinute] = formatTime(step.start_at);
    const [endHour, endMinute] = formatTime(step.end_at);

    editedStep = {
      title: step.title,
      startDate: formatDate(step.start_at),
      startTime: `${startHour}:${startMinute}`,
      endDate: formatDate(step.end_at),
      endTime: `${endHour}:${endMinute}`,
      location: step.location,
      notes: getMemoText(step.notes) || "",
      type: step.type || "normal:general",
    };
    editStartHour = startHour;
    editStartMinute = startMinute;
    editEndHour = endHour;
    editEndMinute = endMinute;
  }

  function cancelEdit() {
    isEditing = false;
    editedStep = {};
    const [startHour, startMinute] = formatTime(step.start_at);
    editStartHour = startHour;
    editStartMinute = startMinute;
    editEndHour = "10";
    editEndMinute = "00";
  }

  async function handleUpdate() {
    if (
      !editedStep.title?.trim() ||
      !editedStep.startDate ||
      !editedStep.startTime ||
      !editedStep.endDate ||
      !editedStep.endTime ||
      !onUpdateStep
    ) {
      alert("タイトル、日付、開始時刻、終了時刻は必須です");
      return;
    }

    const noteText = (editedStep.notes ?? "").trim();
    const notes = updateMemoText(step.notes, noteText);
    const startAt = createTimestamp(editedStep.startDate, editedStep.startTime);
    const endAt = createTimestamp(editedStep.endDate, editedStep.endTime);

    await onUpdateStep(step.id, {
      title: editedStep.title.trim(),
      start_at: startAt,
      end_at: endAt,
      location: editedStep.location?.trim() || undefined,
      notes,
      type: editedStep.type,
    });

    isEditing = false;
    onClose();
  }

  async function handleDelete() {
    if (!confirm("この予定を削除しますか?") || !onDeleteStep) return;
    await onDeleteStep(step.id);
    onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div
  class="standard-autumn-event-dialog-backdrop"
  onclick={handleBackdropClick}
  role="presentation"
>
  <div class="standard-autumn-event-dialog" role="dialog" aria-modal="true">
    <div class="standard-autumn-event-dialog-header">
      <h3 class="standard-autumn-event-dialog-title">予定の詳細</h3>
      <button
        type="button"
        class="standard-autumn-event-dialog-close"
        onclick={onClose}
        aria-label="閉じる"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
          />
        </svg>
      </button>
    </div>

    <div class="standard-autumn-event-dialog-body">
      {#if isSecretStep(step) && !hasEditPermission}
        <div class="standard-autumn-event-secret-notice">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            class="standard-autumn-secret-icon"
          >
            <path
              d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
            />
          </svg>
          <p>この予定は秘密です</p>
          <p class="standard-autumn-secret-notice-sub">
            開始時刻に近づくと詳細が表示されます
          </p>
        </div>
      {:else if isEditing}
        <div class="standard-autumn-form-grid">
          <div class="standard-autumn-form-field">
            <label for="title-input" class="standard-autumn-form-label"
              >タイトル *</label
            >
            <input
              id="title-input"
              type="text"
              bind:value={editedStep.title}
              placeholder="予定のタイトルを入力"
              class="standard-autumn-input"
            />
          </div>
          <div class="standard-autumn-form-field">
            <label for="start-date-input" class="standard-autumn-form-label"
              >開始日時</label
            >
            <div class="standard-autumn-datetime-group">
              <div class="standard-autumn-date-input-wrapper">
                <input
                  id="start-date-input"
                  type="date"
                  bind:value={editedStep.startDate}
                  class="standard-autumn-input"
                />
              </div>
              <div class="standard-autumn-time-picker">
                <select
                  bind:value={editStartHour}
                  class="standard-autumn-select-time"
                  title="時間を選択"
                >
                  {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                    <option value={hour}>{hour}</option>
                  {/each}
                </select>
                <span class="standard-autumn-time-separator">:</span>
                <select
                  bind:value={editStartMinute}
                  class="standard-autumn-select-time"
                  title="分を選択"
                >
                  <option value="00">00</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="45">45</option>
                </select>
              </div>
            </div>
          </div>
          <div class="standard-autumn-form-field">
            <label for="end-date-input" class="standard-autumn-form-label"
              >終了日時</label
            >
            <div class="standard-autumn-datetime-group">
              <div class="standard-autumn-date-input-wrapper">
                <input
                  id="end-date-input"
                  type="date"
                  bind:value={editedStep.endDate}
                  class="standard-autumn-input"
                />
              </div>
              <div class="standard-autumn-time-picker">
                <select
                  bind:value={editEndHour}
                  class="standard-autumn-select-time"
                  title="時間を選択"
                >
                  {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                    <option value={hour}>{hour}</option>
                  {/each}
                </select>
                <span class="standard-autumn-time-separator">:</span>
                <select
                  bind:value={editEndMinute}
                  class="standard-autumn-select-time"
                  title="分を選択"
                >
                  <option value="00">00</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="45">45</option>
                </select>
              </div>
            </div>
          </div>
          <div class="standard-autumn-form-field">
            <label for="location-input" class="standard-autumn-form-label"
              >場所</label
            >
            <input
              id="location-input"
              type="text"
              bind:value={editedStep.location}
              placeholder="場所を入力"
              class="standard-autumn-input"
            />
          </div>
          <div class="standard-autumn-form-field">
            <label for="type-input" class="standard-autumn-form-label"
              >予定の種類</label
            >
            <select
              id="type-input"
              bind:value={editedStep.type}
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
          <div class="standard-autumn-form-field">
            <label for="notes-textarea" class="standard-autumn-form-label"
              >メモ</label
            >
            <textarea
              id="notes-textarea"
              bind:value={editedStep.notes}
              placeholder="メモを入力"
              class="standard-autumn-textarea"
              rows="5"
            ></textarea>
          </div>
        </div>
        <div class="standard-autumn-form-actions">
          <button
            type="button"
            onclick={handleUpdate}
            class="standard-autumn-btn standard-autumn-btn-primary"
          >
            保存
          </button>
          <button
            type="button"
            onclick={cancelEdit}
            class="standard-autumn-btn standard-autumn-btn-secondary"
          >
            キャンセル
          </button>
        </div>
      {:else}
        <div class="standard-autumn-event-detail-content">
          <div class="standard-autumn-event-detail-field">
            <span class="standard-autumn-event-detail-label">タイトル</span>
            <div class="standard-autumn-event-detail-value">{step.title}</div>
          </div>
          <div class="standard-autumn-event-detail-row">
            <div class="standard-autumn-event-detail-field">
              <span class="standard-autumn-event-detail-label">開始日時</span>
              <div class="standard-autumn-event-detail-value">
                <span class="standard-autumn-event-date"
                  >{getStepDate(step)}</span
                >
                <span class="standard-autumn-event-time"
                  >{getStepTime(step)}</span
                >
              </div>
            </div>
            <div class="standard-autumn-event-detail-field">
              <span class="standard-autumn-event-detail-label">終了日時</span>
              <div class="standard-autumn-event-detail-value">
                <span class="standard-autumn-event-date"
                  >{getStepDate(step)}</span
                >
                <span class="standard-autumn-event-time"
                  >{getStepEndTime(step)}</span
                >
              </div>
            </div>
          </div>
          {#if step.location}
            <div class="standard-autumn-event-detail-field">
              <span class="standard-autumn-event-detail-label">場所</span>
              <div class="standard-autumn-event-detail-value">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  class="standard-autumn-event-detail-icon"
                >
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  />
                </svg>
                {step.location}
              </div>
            </div>
          {/if}
          {#if step.notes}
            <div class="standard-autumn-event-detail-field">
              <span class="standard-autumn-event-detail-label">メモ</span>
              <div
                class="standard-autumn-event-detail-value standard-autumn-event-detail-notes"
              >
                {@html renderMarkdown(step.notes || "")}
              </div>
            </div>
          {/if}
        </div>

        {#if hasEditPermission}
          <div class="standard-autumn-event-dialog-actions">
            <button
              type="button"
              onclick={startEdit}
              class="standard-autumn-btn standard-autumn-btn-primary"
            >
              編集
            </button>
            <button
              type="button"
              onclick={handleDelete}
              class="standard-autumn-btn standard-autumn-btn-danger"
            >
              削除
            </button>
          </div>
        {/if}
      {/if}
    </div>
  </div>
</div>

<style>
  .standard-autumn-event-dialog-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .standard-autumn-event-dialog {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    max-width: 600px;
    width: 100%;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .standard-autumn-event-dialog-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    background: linear-gradient(
      135deg,
      var(--standard-autumn-accent) 0%,
      var(--standard-autumn-accent-light, rgba(230, 180, 34, 0.8)) 100%
    );
    border-bottom: 2px solid var(--standard-autumn-border);
  }

  .standard-autumn-event-dialog-title {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  }

  .standard-autumn-event-dialog-close {
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .standard-autumn-event-dialog-close:hover {
    background: rgba(255, 255, 255, 0.2);
    color: #fff;
  }

  .standard-autumn-event-dialog-close svg {
    width: 20px;
    height: 20px;
  }

  .standard-autumn-event-dialog-body {
    padding: 1.5rem;
    overflow-y: auto;
  }

  .standard-autumn-event-detail-content {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .standard-autumn-event-detail-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .standard-autumn-event-detail-label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--standard-autumn-text-light);
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .standard-autumn-event-detail-value {
    font-size: 0.95rem;
    color: var(--standard-autumn-text);
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .standard-autumn-event-date {
    font-weight: 500;
    color: var(--standard-autumn-text);
  }

  .standard-autumn-event-time {
    font-size: 0.9rem;
    color: var(--standard-autumn-text-light);
    font-weight: 600;
  }

  .standard-autumn-event-detail-icon {
    width: 16px;
    height: 16px;
    color: var(--standard-autumn-accent);
    flex-shrink: 0;
  }

  .standard-autumn-event-detail-notes {
    background: rgba(230, 180, 34, 0.05);
    padding: 1rem;
    border-radius: 8px;
    border: 1px dashed var(--standard-autumn-line-color);
    display: block;
  }

  .standard-autumn-event-dialog-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--standard-autumn-border);
  }

  .standard-autumn-form-grid {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .standard-autumn-form-field {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .standard-autumn-form-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--standard-autumn-text);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .standard-autumn-datetime-group {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .standard-autumn-date-input-wrapper {
    flex: 1;
  }

  .standard-autumn-input,
  .standard-autumn-textarea,
  .standard-autumn-select-time {
    font-family: inherit;
    font-size: 1rem;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--standard-autumn-border);
    border-radius: 8px;
    background: #fff;
    color: var(--standard-autumn-text);
    transition: all 0.2s;
  }

  .standard-autumn-input:focus,
  .standard-autumn-textarea:focus,
  .standard-autumn-select-time:focus {
    outline: none;
    border-color: var(--standard-autumn-accent);
    box-shadow: 0 0 0 3px rgba(230, 180, 34, 0.1);
    background: #fff;
  }

  .standard-autumn-input[type="date"] {
    flex: 1;
  }

  .standard-autumn-textarea {
    resize: vertical;
    min-height: 120px;
    font-family: inherit;
  }

  .standard-autumn-select-time {
    flex: 0 1 auto;
    min-width: 60px;
    padding: 0.625rem 0.5rem;
    text-align: center;
  }

  .standard-autumn-time-picker {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .standard-autumn-time-separator {
    color: var(--standard-autumn-text-light);
    font-weight: 600;
    font-size: 1rem;
  }

  .standard-autumn-btn-danger {
    background: #dc2626;
    color: white;
  }

  .standard-autumn-btn-danger:hover {
    background: #b91c1c;
  }

  .standard-autumn-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .standard-autumn-btn-primary {
    background: var(--standard-autumn-accent);
    color: #fff;
  }

  .standard-autumn-btn-primary:hover {
    background: var(--standard-autumn-accent-dark, #d4a726);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(230, 180, 34, 0.3);
  }

  .standard-autumn-btn-primary:active {
    transform: translateY(0);
  }

  .standard-autumn-btn-secondary {
    background: #f5f5f5;
    color: var(--standard-autumn-text);
    border: 1px solid var(--standard-autumn-border);
  }

  .standard-autumn-btn-secondary:hover {
    background: #e8e8e8;
    border-color: var(--standard-autumn-text-light);
  }

  @media (max-width: 600px) {
    .standard-autumn-event-dialog {
      max-width: 100%;
      margin: 0;
      border-radius: 16px 16px 0 0;
      max-height: 90vh;
    }

    .standard-autumn-event-dialog-header {
      padding: 1.25rem 1rem;
    }

    .standard-autumn-event-dialog-title {
      font-size: 1.15rem;
    }

    .standard-autumn-event-dialog-body {
      padding: 1.25rem;
    }

    .standard-autumn-event-detail-row {
      grid-template-columns: 1fr;
    }

    .standard-autumn-form-grid {
      gap: 1.25rem;
    }

    .standard-autumn-form-actions {
      flex-direction: column;
      gap: 0.875rem;
    }

    .standard-autumn-btn {
      width: 100%;
    }

    .standard-autumn-time-picker {
      gap: 0.375rem;
    }

    .standard-autumn-select-time {
      min-width: 55px;
      padding: 0.5rem 0.375rem;
    }
  }

  .standard-autumn-event-secret-notice {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 2rem;
    text-align: center;
    background: linear-gradient(
      135deg,
      rgba(230, 180, 34, 0.05) 0%,
      rgba(230, 180, 34, 0.02) 100%
    );
    border-radius: 12px;
    border: 2px dashed var(--standard-autumn-accent);
  }

  .standard-autumn-secret-icon {
    width: 48px;
    height: 48px;
    color: var(--standard-autumn-accent);
    opacity: 0.8;
  }

  .standard-autumn-event-secret-notice p {
    margin: 0;
    color: var(--standard-autumn-text);
    font-weight: 500;
  }

  .standard-autumn-secret-notice-sub {
    font-size: 0.85rem;
    color: var(--standard-autumn-text-light) !important;
    font-weight: 400;
    margin-top: 0.5rem;
  }

  @media (max-width: 400px) {
    .standard-autumn-event-dialog-backdrop {
      padding: 0;
    }

    .standard-autumn-event-dialog {
      border-radius: 12px 12px 0 0;
    }

    .standard-autumn-event-dialog-header {
      padding: 1rem 0.875rem;
    }

    .standard-autumn-event-dialog-title {
      font-size: 1rem;
    }

    .standard-autumn-event-dialog-body {
      padding: 1rem;
    }

    .standard-autumn-form-grid {
      gap: 1rem;
    }

    .standard-autumn-event-detail-content {
      gap: 1rem;
    }

    .standard-autumn-event-secret-notice {
      padding: 1.5rem;
      border-width: 1px;
    }

    .standard-autumn-secret-icon {
      width: 40px;
      height: 40px;
    }
  }
</style>
