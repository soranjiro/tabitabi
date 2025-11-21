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

  // カルーセル管理
  let activeIndex = $state(0);
  let trackEl = $state<HTMLDivElement | null>(null);
  let touchStartX = $state<number | null>(null);
  let touchDeltaX = $state(0);

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
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date)!.push(step);
    }
    for (const [_, groupSteps] of groups) {
      groupSteps.sort((a, b) => a.time.localeCompare(b.time));
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  });

  function clampIndex(i: number) {
    const total = groupedSteps().length;
    if (i < 0) return 0;
    if (i >= total) return total - 1;
    return i;
  }
  function goTo(i: number) {
    activeIndex = clampIndex(i);
  }
  function next() {
    goTo(activeIndex + 1);
  }
  function prev() {
    goTo(activeIndex - 1);
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === "ArrowRight") {
      next();
    }
    if (e.key === "ArrowLeft") {
      prev();
    }
  }

  function onTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
    touchDeltaX = 0;
  }
  function onTouchMove(e: TouchEvent) {
    if (touchStartX == null) return;
    touchDeltaX = e.touches[0].clientX - touchStartX;
  }
  function onTouchEnd() {
    if (touchStartX == null) return;
    if (touchDeltaX < -50) next();
    else if (touchDeltaX > 50) prev();
    touchStartX = null;
    touchDeltaX = 0;
  }

  // カードクリックでそのカードに移動
  function handleCardClick(index: number) {
    if (index !== activeIndex) {
      goTo(index);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
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
  <div class="fall-empty">予定がまだ登録されていません</div>
{:else}
  <div class="fall-carousel-wrapper">
    <!-- 上部のカルーセルコントロール -->
    <div
      class="fall-carousel-controls fall-carousel-controls-top"
      tabindex="0"
      onkeydown={handleKey}
      role="toolbar"
      aria-label="カルーセル操作"
    >
      <button
        type="button"
        class="fall-carousel-btn"
        onclick={prev}
        disabled={activeIndex === 0}
        aria-label="前の日"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>
      <div class="fall-page-dots" role="tablist" aria-label="日選択">
        {#each Array.from({ length: groupedSteps().length }) as _, i}
          <button
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            class:active={i === activeIndex}
            onclick={() => goTo(i)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && goTo(i)}
            aria-label={`日 ${i + 1}`}
          ></button>
        {/each}
      </div>
      <button
        type="button"
        class="fall-carousel-btn"
        onclick={next}
        disabled={activeIndex === groupedSteps().length - 1}
        aria-label="次の日"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
      </button>
    </div>

    <div
      class="fall-carousel"
      role="region"
      aria-label="日カルーセル"
      ontouchstart={onTouchStart}
      ontouchmove={onTouchMove}
      ontouchend={onTouchEnd}
    >
      <div
        class="fall-carousel-track"
        bind:this={trackEl}
        style={`--active:${activeIndex};`}
      >
        {#each groupedSteps() as [date, dateSteps], idx}
          <section
            class="fall-carousel-card"
            aria-hidden={idx !== activeIndex}
            onclick={() => handleCardClick(idx)}
            role="button"
            tabindex="0"
          >
            <div class="fall-card">
              <header class="fall-card-header">
                {formatDate(date)}
              </header>
              <div class="fall-card-body">
                {#each dateSteps as step}
                  <div class="fall-timeline-item">
                    <div class="fall-step-time">{step.time}</div>
                    <div class="fall-timeline-line"></div>
                    <div class="fall-step-dot"></div>

                    {#if editingStepId === step.id}
                      <div class="fall-step-editing">
                        <h3 class="fall-form-title">予定を編集</h3>
                        <div class="fall-form-grid">
                          <input
                            type="text"
                            bind:value={editedStep.title}
                            placeholder="予定のタイトル *"
                            class="fall-input"
                          />
                          <div class="fall-datetime">
                            <input
                              type="date"
                              bind:value={editedStep.date}
                              class="fall-input"
                            />
                            <div class="fall-time-picker">
                              <select
                                bind:value={editStepHour}
                                class="fall-select-time"
                              >
                                {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
                                  <option value={hour}>{hour}</option>
                                {/each}
                              </select>
                              <span class="fall-time-separator">:</span>
                              <select
                                bind:value={editStepMinute}
                                class="fall-select-time"
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
                            class="fall-input"
                          />
                          <textarea
                            bind:value={editedStep.notes}
                            placeholder="メモ (任意)"
                            class="fall-textarea"
                            rows="3"
                          ></textarea>
                        </div>
                        <div class="fall-form-actions">
                          <button
                            onclick={handleUpdate}
                            class="fall-btn fall-btn-primary">保存</button
                          >
                          <button
                            onclick={cancelEdit}
                            class="fall-btn fall-btn-secondary"
                            >キャンセル</button
                          >
                        </div>
                      </div>
                    {:else}
                      <div class="fall-step-content">
                        <div class="fall-step-title">
                          {step.title}
                          <button
                            onclick={() => startEdit(step)}
                            class="fall-btn-icon"
                            title="編集"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path
                                d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                              />
                            </svg>
                          </button>
                          <button
                            onclick={() => handleDelete(step.id)}
                            class="fall-btn-icon"
                            title="削除"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path
                                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                              />
                            </svg>
                          </button>
                        </div>
                        {#if step.location}
                          <div class="fall-step-location">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              class="fall-icon-location"
                            >
                              <path
                                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                              />
                            </svg>
                            {step.location}
                          </div>
                        {/if}
                        {#if step.notes}
                          <div class="fall-step-notes">{step.notes}</div>
                        {/if}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          </section>
        {/each}
      </div>
    </div>

    <!-- 下部のカルーセルコントロール -->
    <div
      class="fall-carousel-controls fall-carousel-controls-bottom"
      tabindex="0"
      onkeydown={handleKey}
      role="toolbar"
      aria-label="カルーセル操作"
    >
      <button
        type="button"
        class="fall-carousel-btn"
        onclick={prev}
        disabled={activeIndex === 0}
        aria-label="前の日"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>
      <div class="fall-page-dots" role="tablist" aria-label="日選択">
        {#each Array.from({ length: groupedSteps().length }) as _, i}
          <button
            type="button"
            role="tab"
            aria-selected={i === activeIndex}
            class:active={i === activeIndex}
            onclick={() => goTo(i)}
            onkeydown={(e) => (e.key === "Enter" || e.key === " ") && goTo(i)}
            aria-label={`日 ${i + 1}`}
          ></button>
        {/each}
      </div>
      <button
        type="button"
        class="fall-carousel-btn"
        onclick={next}
        disabled={activeIndex === groupedSteps().length - 1}
        aria-label="次の日"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
      </button>
    </div>
  </div>
{/if}
