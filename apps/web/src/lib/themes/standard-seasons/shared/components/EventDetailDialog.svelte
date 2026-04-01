<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { renderMarkdown } from "../utils/markdown";
  import { getMemoText, updateMemoText } from "$lib/memo";

  interface Props {
    step: Step;
    hasEditPermission?: boolean;
    onClose: () => void;
    onEditMode?: () => void;
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
    step,
    hasEditPermission = false,
    onClose,
    onEditMode,
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();

  let isEditing = $state(false);
  let editedStep = $state<Partial<Step>>({ ...step });
  let editStepHour = $state(step.time.split(":")[0]);
  let editStepMinute = $state(step.time.split(":")[1]);

  $effect(() => {
    if (isEditing && editStepHour && editStepMinute) {
      editedStep.time = `${editStepHour}:${editStepMinute}`;
    }
  });

  function startEdit() {
    isEditing = true;
    editedStep = {
      ...step,
      notes: getMemoText(step.notes) || "",
    };
    const [hour, minute] = step.time.split(":");
    editStepHour = hour;
    editStepMinute = minute;
  }

  function cancelEdit() {
    isEditing = false;
    editedStep = { ...step };
    const [hour, minute] = step.time.split(":");
    editStepHour = hour;
    editStepMinute = minute;
  }

  async function handleUpdate() {
    if (
      !editedStep.title?.trim() ||
      !editedStep.date ||
      !editedStep.time ||
      !onUpdateStep
    ) {
      alert("タイトル、日付、時刻は必須です");
      return;
    }

    const noteText = (editedStep.notes ?? "").trim();
    const notes = updateMemoText(step.notes, noteText);

    await onUpdateStep(step.id, {
      title: editedStep.title.trim(),
      date: editedStep.date,
      time: editedStep.time,
      location: editedStep.location?.trim() || undefined,
      notes,
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
      {#if isEditing}
        <div class="standard-autumn-form-grid">
          <input
            type="text"
            bind:value={editedStep.title}
            placeholder="予定のタイトル *"
            class="standard-autumn-input"
          />
          <div class="standard-autumn-datetime">
            <input
              type="date"
              bind:value={editedStep.date}
              class="standard-autumn-input"
            />
            <div class="standard-autumn-time-picker">
              <select
                bind:value={editStepHour}
                class="standard-autumn-select-time"
              >
                {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                  <option value={hour}>{hour}</option>
                {/each}
              </select>
              <span class="standard-autumn-time-separator">:</span>
              <select
                bind:value={editStepMinute}
                class="standard-autumn-select-time"
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
            bind:value={editedStep.location}
            placeholder="場所 (任意)"
            class="standard-autumn-input"
          />
          <textarea
            bind:value={editedStep.notes}
            placeholder="メモ (任意)"
            class="standard-autumn-textarea"
            rows="5"
          ></textarea>
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
            <label>タイトル</label>
            <div class="standard-autumn-event-detail-value">{step.title}</div>
          </div>
          <div class="standard-autumn-event-detail-row">
            <div class="standard-autumn-event-detail-field">
              <label>日付</label>
              <div class="standard-autumn-event-detail-value">{step.date}</div>
            </div>
            <div class="standard-autumn-event-detail-field">
              <label>時間</label>
              <div class="standard-autumn-event-detail-value">{step.time}</div>
            </div>
          </div>
          {#if step.location}
            <div class="standard-autumn-event-detail-field">
              <label>場所</label>
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
              <label>メモ</label>
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
              onclick={() => {
                onEditMode?.();
                isEditing = true;
                editedStep = {
                  ...step,
                  notes: getMemoText(step.notes) || "",
                };
                const [hour, minute] = step.time.split(":");
                editStepHour = hour;
                editStepMinute = minute;
              }}
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
    border-bottom: 1px solid var(--standard-autumn-border);
  }

  .standard-autumn-event-dialog-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--standard-autumn-text);
  }

  .standard-autumn-event-dialog-close {
    background: none;
    border: none;
    padding: 0.5rem;
    cursor: pointer;
    color: var(--standard-autumn-text-light);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .standard-autumn-event-dialog-close:hover {
    background: var(--standard-autumn-border);
    color: var(--standard-autumn-text);
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

  .standard-autumn-event-detail-field label {
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
    align-items: center;
    gap: 0.5rem;
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

  .standard-autumn-btn-danger {
    background: #dc2626;
    color: white;
  }

  .standard-autumn-btn-danger:hover {
    background: #b91c1c;
  }

  @media (max-width: 600px) {
    .standard-autumn-event-dialog {
      max-width: 100%;
      margin: 0;
      border-radius: 16px 16px 0 0;
      max-height: 90vh;
    }

    .standard-autumn-event-detail-row {
      grid-template-columns: 1fr;
    }
  }
</style>
