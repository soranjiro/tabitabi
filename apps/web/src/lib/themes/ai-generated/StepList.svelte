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

  // 日付ごとにグループ化
  const groupedSteps = $derived(() => {
    const groups = new Map<string, Step[]>();

    for (const step of steps) {
      const date = step.date;
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(step);
    }

    // 各グループ内を時刻順にソート
    for (const [_, groupSteps] of groups) {
      groupSteps.sort((a, b) => a.time.localeCompare(b.time));
    }

    // 日付順にソート
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
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
  <div class="ai-generated-empty">
    <div class="ai-generated-empty-icon">📅</div>
    <p class="ai-generated-empty-text">予定がまだ登録されていません</p>
    <p class="ai-generated-empty-subtext">上の「＋予定を追加」から始めましょう</p>
  </div>
{:else}
  <div class="ai-generated-steps">
    {#each groupedSteps() as [date, dateSteps], groupIndex}
      <div class="ai-generated-date-group">
        <h2 class="ai-generated-date-header">
          <span class="ai-generated-date-icon">📅</span>
          {formatDate(date)}
        </h2>
        <div class="ai-generated-date-steps">
          {#each dateSteps as step, index}
            {#if editingStepId === step.id}
              <div class="ai-generated-step ai-generated-step-editing">
                <div class="ai-generated-step-time-badge">{step.time}</div>
                <div class="ai-generated-step-content">
                  <h3 class="ai-generated-form-title">予定を編集</h3>
                  <div class="ai-generated-form-grid">
                    <input
                      type="text"
                      bind:value={editedStep.title}
                      placeholder="予定のタイトル *"
                      class="ai-generated-input"
                    />
                    <div class="ai-generated-datetime">
                      <input
                        type="date"
                        bind:value={editedStep.date}
                        class="ai-generated-input"
                      />
                      <div class="ai-generated-time-picker">
                        <select
                          bind:value={editStepHour}
                          class="ai-generated-select-time"
                        >
                          {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                            <option value={hour}>{hour}</option>
                          {/each}
                        </select>
                        <span class="ai-generated-time-separator">:</span>
                        <select
                          bind:value={editStepMinute}
                          class="ai-generated-select-time"
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
                      class="ai-generated-input"
                    />
                    <textarea
                      bind:value={editedStep.notes}
                      placeholder="📝 メモ (任意)"
                      class="ai-generated-textarea"
                      rows="3"
                    ></textarea>
                  </div>
                  <div class="ai-generated-step-actions">
                    <button
                      onclick={handleUpdate}
                      class="ai-generated-btn ai-generated-btn-primary"
                    >
                      保存
                    </button>
                    <button
                      onclick={cancelEdit}
                      class="ai-generated-btn ai-generated-btn-secondary"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              </div>
            {:else}
              <div class="ai-generated-step">
                <div class="ai-generated-step-time-badge">{step.time}</div>
                <div class="ai-generated-step-content">
                  <div class="ai-generated-step-header">
                    <h3 class="ai-generated-step-title">{step.title}</h3>
                    <div class="ai-generated-step-actions">
                      <button
                        onclick={() => startEdit(step)}
                        class="ai-generated-btn-icon"
                        title="編集"
                      >
                        ✏️
                      </button>
                      <button
                        onclick={() => handleDelete(step.id)}
                        class="ai-generated-btn-icon ai-generated-btn-danger"
                        title="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {#if step.location}
                    <div class="ai-generated-step-location">📍 {step.location}</div>
                  {/if}
                  {#if step.notes}
                    <div class="ai-generated-step-notes">{step.notes}</div>
                  {/if}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}
