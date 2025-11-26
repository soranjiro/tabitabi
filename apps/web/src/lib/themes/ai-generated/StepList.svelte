<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { formatDate, getDayNumber, isSecretStep } from "./utils";
  import { renderMarkdown } from "./utils/markdown";

  interface Props {
    steps: Step[];
    hasEditPermission: boolean;
    secretModeEnabled: boolean;
    secretModeOffset: number;
    focusedDate?: string | null;
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
    hasEditPermission,
    secretModeEnabled = false,
    secretModeOffset = 60,
    focusedDate = $bindable(null),
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();

  let editingStepId = $state<string | null>(null);
  let editedStep = $state<Partial<Step>>({});
  let editStepHour = $state("09");
  let editStepMinute = $state("00");

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

  const allDates = $derived(steps.map((s) => s.date));

  function startEdit(step: Step) {
    if (!hasEditPermission) return;
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
    cancelEdit();
  }

  async function handleDelete(stepId: string) {
    if (!confirm("この予定を削除しますか？")) return;
    if (onDeleteStep) {
      await onDeleteStep(stepId);
    }
  }

  function handleDateFocus(date: string) {
    focusedDate = date;
  }
</script>

{#if steps.length === 0}
  <div class="ai-empty ai-card">
    <div class="ai-empty-icon">✈️</div>
    <h3 class="ai-empty-title">予定がまだありません</h3>
    <p class="ai-empty-text">「＋予定を追加」から始めましょう</p>
  </div>
{:else}
  <div class="ai-timeline">
    {#each groupedSteps() as [date, dateSteps]}
      {@const dayNum = getDayNumber(allDates, date)}
      {@const isSecret = secretModeEnabled}

      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <section class="ai-date-section" onclick={() => handleDateFocus(date)}>
        <div class="ai-date-header">
          <span class="ai-date-icon">📅</span>
          <span class="ai-date-text">{formatDate(date)}</span>
          <span class="ai-day-badge">Day {dayNum}</span>
        </div>

        <div class="ai-steps-list">
          {#each dateSteps as step}
            {@const isStepSecret =
              isSecret && isSecretStep(step.date, step.time, secretModeOffset)}

            {#if editingStepId === step.id}
              <div
                class="ai-step ai-card"
                style="border: 2px solid var(--ai-primary);"
              >
                <div class="ai-step-content" style="flex: 1;">
                  <h4 class="ai-form-title">予定を編集</h4>
                  <div class="ai-form-grid">
                    <input
                      type="text"
                      bind:value={editedStep.title}
                      placeholder="予定のタイトル"
                      class="ai-input"
                    />
                    <div class="ai-datetime-row">
                      <input
                        type="date"
                        bind:value={editedStep.date}
                        class="ai-input"
                      />
                      <div class="ai-time-picker">
                        <select
                          bind:value={editStepHour}
                          class="ai-time-select"
                        >
                          {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                            <option value={hour}>{hour}</option>
                          {/each}
                        </select>
                        <span class="ai-time-sep">:</span>
                        <select
                          bind:value={editStepMinute}
                          class="ai-time-select"
                        >
                          {#each ["00", "15", "30", "45"] as minute}
                            <option value={minute}>{minute}</option>
                          {/each}
                        </select>
                      </div>
                    </div>
                    <input
                      type="text"
                      bind:value={editedStep.location}
                      placeholder="📍 場所（任意）"
                      class="ai-input"
                    />
                    <textarea
                      bind:value={editedStep.notes}
                      placeholder="📝 メモ（任意）"
                      class="ai-textarea"
                      rows="3"
                    ></textarea>
                  </div>
                  <div class="ai-form-actions" style="margin-top: 1rem;">
                    <button
                      type="button"
                      class="ai-btn ai-btn-primary"
                      onclick={handleUpdate}
                    >
                      保存
                    </button>
                    <button
                      type="button"
                      class="ai-btn ai-btn-secondary"
                      onclick={cancelEdit}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            {:else}
              <div class="ai-step ai-card" class:ai-step-secret={isStepSecret}>
                <div class="ai-step-header">
                  <span class="ai-step-time">🕐 {step.time}</span>
                  {#if isStepSecret}
                    <span class="ai-step-secret-label">🔒 シークレット</span>
                  {/if}
                  {#if hasEditPermission}
                    <div class="ai-step-actions">
                      <button
                        type="button"
                        class="ai-btn-icon"
                        onclick={() => startEdit(step)}
                        title="編集"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        class="ai-btn-icon ai-btn-icon-danger"
                        onclick={() => handleDelete(step.id)}
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  {/if}
                </div>

                <h3 class="ai-step-title">
                  {isStepSecret ? "???" : step.title}
                </h3>

                {#if step.location && !isStepSecret}
                  <div class="ai-step-location">
                    📍 {step.location}
                  </div>
                {/if}

                {#if step.notes && !isStepSecret}
                  <div class="ai-step-notes">
                    {@html renderMarkdown(step.notes)}
                  </div>
                {/if}
              </div>
            {/if}
          {/each}
        </div>
      </section>
    {/each}
  </div>
{/if}
