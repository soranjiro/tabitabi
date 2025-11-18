<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    steps: Step[];
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

  let { steps, onUpdateStep, onDeleteStep }: Props = $props();

  let editingStepId = $state<string | null>(null);
  let editedStep = $state<Partial<Step>>({});
  let editStepHour = $state("09");
  let editStepMinute = $state("00");

  $effect(() => {
    if (editingStepId && editStepHour && editStepMinute) {
      editedStep.time = `${editStepHour}:${editStepMinute}`;
    }
  });

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  }

  function startEdit(step: Step) {
    editingStepId = step.id;
    editedStep = { ...step };
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

    if (onUpdateStep) {
      await onUpdateStep(editingStepId, {
        title: editedStep.title.trim(),
        date: editedStep.date,
        time: editedStep.time,
        location: editedStep.location?.trim() || undefined,
        notes: editedStep.notes?.trim() || undefined,
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
</script>

{#if steps.length === 0}
  <div class="standard-empty">
    <div class="standard-empty-icon">📅</div>
    <p class="standard-empty-text">予定がまだ登録されていません</p>
    <p class="standard-empty-subtext">上の「＋予定を追加」から始めましょう</p>
  </div>
{:else}
  <div class="standard-steps">
    {#each steps as step, index}
      {#if editingStepId === step.id}
        <div class="standard-step standard-step-editing">
          <div class="standard-step-number">{index + 1}</div>
          <div class="standard-step-content">
            <h3 class="standard-form-title">予定を編集</h3>
            <div class="standard-form-grid">
              <input
                type="text"
                bind:value={editedStep.title}
                placeholder="予定のタイトル *"
                class="standard-input"
              />
              <div class="standard-datetime">
                <input
                  type="date"
                  bind:value={editedStep.date}
                  class="standard-input"
                />
                <div class="standard-time-picker">
                  <select
                    bind:value={editStepHour}
                    class="standard-select-time"
                  >
                    {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                      <option value={hour}>{hour}</option>
                    {/each}
                  </select>
                  <span class="standard-time-separator">:</span>
                  <select
                    bind:value={editStepMinute}
                    class="standard-select-time"
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
                placeholder="📍 場所 (任意)"
                class="standard-input"
              />
              <textarea
                bind:value={editedStep.notes}
                placeholder="📝 メモ (任意)"
                class="standard-textarea"
                rows="3"
              ></textarea>
            </div>
            <div class="standard-step-actions">
              <button
                onclick={handleUpdate}
                class="standard-btn standard-btn-primary"
              >
                保存
              </button>
              <button
                onclick={cancelEdit}
                class="standard-btn standard-btn-secondary"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      {:else}
        <div class="standard-step">
          <div class="standard-step-number">{index + 1}</div>
          <div class="standard-step-content">
            <div class="standard-step-header">
              <div>
                <h3 class="standard-step-title">{step.title}</h3>
                <div class="standard-step-meta">
                  <span class="standard-step-date">{formatDate(step.date)}</span
                  >
                  <span class="standard-step-time">🕐 {step.time}</span>
                </div>
              </div>
              <div class="standard-step-actions">
                <button
                  onclick={() => startEdit(step)}
                  class="standard-btn-icon"
                  title="編集"
                >
                  ✏️
                </button>
                <button
                  onclick={() => handleDelete(step.id)}
                  class="standard-btn-icon standard-btn-danger"
                  title="削除"
                >
                  🗑️
                </button>
              </div>
            </div>
            {#if step.location}
              <div class="standard-step-location">📍 {step.location}</div>
            {/if}
            {#if step.notes}
              <div class="standard-step-notes">{step.notes}</div>
            {/if}
          </div>
        </div>
      {/if}
    {/each}
  </div>
{/if}
