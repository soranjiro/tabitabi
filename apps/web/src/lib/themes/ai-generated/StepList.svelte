<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate, getStepTime, createTimestamp } from "@tabitabi/types";
  import { getMemoText, updateMemoText } from "$lib/memo";
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
        start_at?: number;
        end_at?: number;
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

  let editStepDate = $state("");

  $effect(() => {
    if (editingStepId && editStepDate && editStepHour && editStepMinute) {
      const time = `${editStepHour}:${editStepMinute}`;
      editedStep.start_at = createTimestamp(editStepDate, time);
    }
  });

  const groupedSteps = $derived(() => {
    const groups = new Map<string, Step[]>();
    for (const step of steps) {
      const date = getStepDate(step);
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(step);
    }
    for (const [_, groupSteps] of groups) {
      groupSteps.sort((a, b) => a.start_at - b.start_at);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  });

  const allDates = $derived(steps.map((s) => getStepDate(s)));

  function startEdit(step: Step) {
    if (!hasEditPermission) return;
    editingStepId = step.id;
    editedStep = { ...step, notes: getMemoText(step.notes) };
    editStepDate = getStepDate(step);
    const [hour, minute] = getStepTime(step).split(":");
    editStepHour = hour;
    editStepMinute = minute;
  }

  function cancelEdit() {
    editingStepId = null;
    editedStep = {};
    editStepDate = "";
    editStepHour = "09";
    editStepMinute = "00";
  }

  async function handleUpdate() {
    if (
      !editingStepId ||
      !editedStep.title?.trim() ||
      !editStepDate ||
      !editStepHour ||
      !editStepMinute
    ) {
      alert("タイトル、日付、時刻は必須です");
      return;
    }
    const originalStep = steps.find((s) => s.id === editingStepId);
    const noteText = (editedStep.notes ?? "").trim();
    const notes = updateMemoText(originalStep?.notes, noteText);
    const startAt = createTimestamp(
      editStepDate,
      `${editStepHour}:${editStepMinute}`,
    );
    if (onUpdateStep) {
      await onUpdateStep(editingStepId, {
        title: editedStep.title.trim(),
        start_at: startAt,
        location: editedStep.location?.trim() || undefined,
        notes,
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

  function getTimeIcon(time: string): string {
    const hour = parseInt(time.split(":")[0]);
    if (hour >= 5 && hour < 7) return "🌅";
    if (hour >= 7 && hour < 11) return "☀️";
    if (hour >= 11 && hour < 14) return "🌤️";
    if (hour >= 14 && hour < 17) return "🌇";
    if (hour >= 17 && hour < 20) return "🌆";
    if (hour >= 20 && hour < 23) return "🌙";
    return "🌃";
  }

  function getCategoryIcon(step: Step): string {
    const text = (step.title + " " + (step.notes || "")).toLowerCase();
    if (
      text.includes("飛行機") ||
      text.includes("空港") ||
      text.includes("フライト")
    )
      return "✈️";
    if (text.includes("電車") || text.includes("駅") || text.includes("新幹線"))
      return "🚄";
    if (text.includes("バス")) return "🚌";
    if (
      text.includes("ホテル") ||
      text.includes("旅館") ||
      text.includes("宿") ||
      text.includes("チェックイン")
    )
      return "🏨";
    if (text.includes("朝食") || text.includes("朝ごはん")) return "🍳";
    if (text.includes("昼食") || text.includes("ランチ")) return "🍽️";
    if (text.includes("夕食") || text.includes("ディナー")) return "🍴";
    if (text.includes("カフェ") || text.includes("コーヒー")) return "☕";
    if (text.includes("神社")) return "⛩️";
    if (text.includes("温泉") || text.includes("スパ")) return "♨️";
    if (text.includes("買い物") || text.includes("ショッピング")) return "🛍️";
    if (text.includes("海") || text.includes("ビーチ")) return "🏖️";
    if (text.includes("山") || text.includes("登山")) return "⛰️";
    return "📍";
  }

  function isCurrentStep(step: Step): boolean {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    if (getStepDate(step) !== today) return false;

    const time = getStepTime(step);
    const [hour, minute] = time.split(":").map(Number);
    const stepMinutes = hour * 60 + minute;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    return Math.abs(stepMinutes - nowMinutes) <= 30;
  }
</script>

{#if steps.length === 0}
  <div class="ai-empty">
    <div class="ai-empty-illustration">
      <div class="ai-empty-plane">✈️</div>
      <div class="ai-empty-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
    <h3 class="ai-empty-title">旅の予定を追加しよう</h3>
    <p class="ai-empty-text">右下の＋ボタンから予定を追加できます</p>
  </div>
{:else}
  <div class="ai-timeline">
    {#each groupedSteps() as [date, dateSteps], groupIndex}
      {@const dayNum = getDayNumber(allDates, date)}
      {@const isSecret = secretModeEnabled}

      <section
        class="ai-date-section"
        style="--group-delay: {groupIndex * 0.1}s"
      >
        <div class="ai-date-header">
          <div class="ai-day-badge-container">
            <span class="ai-day-badge">Day {dayNum}</span>
          </div>
          <div class="ai-date-info">
            <span class="ai-date-text">{formatDate(date)}</span>
            <span class="ai-date-count">{dateSteps.length} 件の予定</span>
          </div>
        </div>

        <div class="ai-steps-list">
          {#each dateSteps as step, stepIndex}
            {@const isStepSecret =
              isSecret &&
              isSecretStep(
                getStepDate(step),
                getStepTime(step),
                secretModeOffset,
              )}
            {@const isCurrent = isCurrentStep(step)}

            {#if editingStepId === step.id}
              <div class="ai-step ai-step-editing">
                <div class="ai-step-content">
                  <h4 class="ai-form-title">✏️ 予定を編集</h4>
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
                        bind:value={editStepDate}
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
                  <div class="ai-form-actions">
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
              <div
                class="ai-step ai-step-card"
                class:ai-step-secret={isStepSecret}
                class:ai-step-current={isCurrent}
                style="--step-delay: {stepIndex * 0.08}s"
              >
                <div class="ai-step-timeline-marker">
                  <div class="ai-step-time-icon">
                    {getTimeIcon(getStepTime(step))}
                  </div>
                  <div class="ai-step-connector"></div>
                </div>

                <div class="ai-step-card-content">
                  {#if isCurrent}
                    <div class="ai-step-current-badge">
                      <span class="ai-pulse-dot"></span>
                      NOW
                    </div>
                  {/if}

                  <div class="ai-step-card-header">
                    <div class="ai-step-time-badge">{getStepTime(step)}</div>
                    <span class="ai-step-category-icon"
                      >{getCategoryIcon(step)}</span
                    >
                    {#if isStepSecret}
                      <span class="ai-step-secret-badge">🔒</span>
                    {/if}
                  </div>

                  <h2 class="ai-step-title">
                    {isStepSecret ? "🎁 シークレット" : step.title}
                  </h2>

                  {#if step.location && !isStepSecret}
                    <div class="ai-step-location">
                      <span class="ai-location-icon">📍</span>
                      <span>{step.location}</span>
                    </div>
                  {/if}

                  {#if step.notes && !isStepSecret}
                    <div class="ai-step-notes">
                      {@html renderMarkdown(step.notes)}
                    </div>
                  {/if}

                  {#if hasEditPermission}
                    <div class="ai-step-actions">
                      <button
                        type="button"
                        class="ai-btn-action"
                        onclick={() => startEdit(step)}
                        title="編集"
                        aria-label="編集"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <path
                            d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
                          />
                          <path
                            d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
                          />
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="ai-btn-action ai-btn-action-danger"
                        onclick={() => handleDelete(step.id)}
                        title="削除"
                        aria-label="削除"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path
                            d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                          />
                        </svg>
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          {/each}
        </div>
      </section>
    {/each}
  </div>
{/if}
