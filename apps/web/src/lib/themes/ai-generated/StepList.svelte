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
    if (step.date !== today) return false;

    const [hour, minute] = step.time.split(":").map(Number);
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
              isSecret && isSecretStep(step.date, step.time, secretModeOffset)}
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
                  <div class="ai-step-time-icon">{getTimeIcon(step.time)}</div>
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
                    <div class="ai-step-time-badge">{step.time}</div>
                    <span class="ai-step-category-icon"
                      >{getCategoryIcon(step)}</span
                    >
                    {#if isStepSecret}
                      <span class="ai-step-secret-badge">🔒</span>
                    {/if}
                  </div>

                  <h3 class="ai-step-title">
                    {isStepSecret ? "🎁 シークレット" : step.title}
                  </h3>

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

<style>
  .ai-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .ai-empty-illustration {
    position: relative;
    margin-bottom: 1.5rem;
  }

  .ai-empty-plane {
    font-size: 4rem;
    animation: float 3s ease-in-out infinite;
  }

  .ai-empty-dots {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .ai-empty-dots span {
    width: 8px;
    height: 8px;
    background: var(--ai-primary);
    border-radius: 50%;
    animation: bounce 1.5s ease infinite;
  }

  .ai-empty-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }
  .ai-empty-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes float {
    0%,
    100% {
      transform: translateY(0) rotate(-5deg);
    }
    50% {
      transform: translateY(-10px) rotate(5deg);
    }
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
      opacity: 0.3;
    }
    50% {
      transform: translateY(-8px);
      opacity: 1;
    }
  }

  .ai-empty-title {
    margin: 0 0 0.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--ai-text-primary);
  }

  .ai-empty-text {
    margin: 0;
    font-size: 0.875rem;
    color: var(--ai-text-muted);
  }

  .ai-timeline {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    padding-bottom: 6rem;
  }

  .ai-date-section {
    animation: fadeSlideIn 0.5s ease backwards;
    animation-delay: var(--group-delay);
  }

  @keyframes fadeSlideIn {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .ai-date-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid var(--ai-border);
  }

  .ai-day-badge-container {
    flex-shrink: 0;
  }

  .ai-day-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 1rem;
    background: linear-gradient(
      135deg,
      var(--ai-primary) 0%,
      var(--ai-secondary) 100%
    );
    color: white;
    font-size: 0.875rem;
    font-weight: 700;
    border-radius: 2rem;
    box-shadow: var(--ai-glow-primary);
  }

  .ai-date-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .ai-date-text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--ai-text-primary);
  }

  .ai-date-count {
    font-size: 0.75rem;
    color: var(--ai-text-muted);
  }

  .ai-steps-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .ai-step {
    animation: stepSlideIn 0.4s ease backwards;
    animation-delay: calc(var(--group-delay) + var(--step-delay));
  }

  @keyframes stepSlideIn {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .ai-step-card {
    display: flex;
    gap: 1rem;
    position: relative;
  }

  .ai-step-timeline-marker {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 44px;
  }

  .ai-step-time-icon {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    background: var(--ai-surface);
    border: 2px solid var(--ai-border);
    border-radius: 50%;
    z-index: 1;
    transition: all 0.3s ease;
  }

  .ai-step-card:hover .ai-step-time-icon {
    border-color: var(--ai-primary);
    box-shadow: var(--ai-glow-primary);
    transform: scale(1.1);
  }

  .ai-step-current .ai-step-time-icon {
    border-color: var(--ai-accent);
    background: linear-gradient(
      135deg,
      var(--ai-accent) 0%,
      var(--ai-accent-light) 100%
    );
    animation: pulse 2s ease infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.4);
    }
    50% {
      box-shadow: 0 0 0 8px rgba(20, 184, 166, 0);
    }
  }

  .ai-step-connector {
    flex: 1;
    width: 2px;
    background: linear-gradient(180deg, var(--ai-border) 0%, transparent 100%);
    margin-top: 4px;
    min-height: 20px;
  }

  .ai-step-card-content {
    flex: 1;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-lg);
    padding: 1rem;
    position: relative;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .ai-step-card:hover .ai-step-card-content {
    transform: translateY(-2px);
    box-shadow: var(--ai-shadow-lg);
    border-color: var(--ai-primary-light);
  }

  .ai-step-current .ai-step-card-content {
    background: linear-gradient(
      135deg,
      rgba(20, 184, 166, 0.08) 0%,
      rgba(45, 212, 191, 0.08) 100%
    );
    border-color: var(--ai-accent);
  }

  .ai-step-secret .ai-step-card-content {
    background: repeating-linear-gradient(
      45deg,
      var(--ai-surface),
      var(--ai-surface) 10px,
      rgba(99, 102, 241, 0.05) 10px,
      rgba(99, 102, 241, 0.05) 20px
    );
    border-style: dashed;
  }

  .ai-step-current-badge {
    position: absolute;
    top: -8px;
    right: 1rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.625rem;
    background: var(--ai-accent);
    color: white;
    font-size: 0.625rem;
    font-weight: 700;
    border-radius: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .ai-pulse-dot {
    width: 6px;
    height: 6px;
    background: white;
    border-radius: 50%;
    animation: pulseDot 1s ease infinite;
  }

  @keyframes pulseDot {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }

  .ai-step-card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .ai-step-time-badge {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ai-primary);
    background: rgba(99, 102, 241, 0.1);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  .ai-step-category-icon {
    font-size: 1rem;
  }

  .ai-step-secret-badge {
    font-size: 0.875rem;
    margin-left: auto;
  }

  .ai-step-title {
    margin: 0 0 0.5rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--ai-text-primary);
    line-height: 1.4;
  }

  .ai-step-location {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.875rem;
    color: var(--ai-text-secondary);
    margin-bottom: 0.5rem;
  }

  .ai-location-icon {
    font-size: 0.875rem;
  }

  .ai-step-notes {
    font-size: 0.875rem;
    color: var(--ai-text-secondary);
    line-height: 1.6;
    padding: 0.75rem;
    background: var(--ai-surface-hover);
    border-radius: var(--ai-radius-md);
    margin-top: 0.5rem;
  }

  .ai-step-notes :global(p) {
    margin: 0 0 0.5rem;
  }

  .ai-step-notes :global(p:last-child) {
    margin-bottom: 0;
  }

  .ai-step-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--ai-border-light);
  }

  .ai-btn-action {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-sm);
    color: var(--ai-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ai-btn-action:hover {
    background: var(--ai-primary);
    border-color: var(--ai-primary);
    color: white;
    transform: scale(1.1);
  }

  .ai-btn-action-danger:hover {
    background: var(--ai-error, #ef4444);
    border-color: var(--ai-error, #ef4444);
  }

  .ai-step-editing {
    background: var(--ai-surface);
    border: 2px solid var(--ai-primary);
    border-radius: var(--ai-radius-lg);
    padding: 1.25rem;
  }

  .ai-form-title {
    margin: 0 0 1rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--ai-text-primary);
  }

  .ai-form-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .ai-input,
  .ai-textarea {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.875rem;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-md);
    color: var(--ai-text-primary);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .ai-input:focus,
  .ai-textarea:focus {
    outline: none;
    border-color: var(--ai-primary);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  }

  .ai-datetime-row {
    display: flex;
    gap: 0.75rem;
  }

  .ai-time-picker {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .ai-time-select {
    padding: 0.75rem 0.5rem;
    font-size: 0.875rem;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-md);
    color: var(--ai-text-primary);
  }

  .ai-time-sep {
    color: var(--ai-text-muted);
    font-weight: 600;
  }

  .ai-form-actions {
    display: flex;
    gap: 0.75rem;
    margin-top: 1rem;
  }

  .ai-btn {
    padding: 0.625rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    border-radius: var(--ai-radius-md);
    border: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ai-btn-primary {
    background: linear-gradient(
      135deg,
      var(--ai-primary) 0%,
      var(--ai-primary-dark, var(--ai-primary)) 100%
    );
    color: white;
  }

  .ai-btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: var(--ai-shadow-md);
  }

  .ai-btn-secondary {
    background: var(--ai-surface);
    color: var(--ai-text-secondary);
    border: 1px solid var(--ai-border);
  }

  .ai-btn-secondary:hover {
    background: var(--ai-surface-hover);
    color: var(--ai-text-primary);
  }

  @media (prefers-reduced-motion: reduce) {
    .ai-date-section,
    .ai-step,
    .ai-empty-plane,
    .ai-empty-dots span,
    .ai-step-current .ai-step-time-icon {
      animation: none;
    }
  }
</style>
