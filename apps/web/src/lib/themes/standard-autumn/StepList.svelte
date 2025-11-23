<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { marked } from "marked";

  interface Props {
    steps: Step[];
    hasEditPermission?: boolean;
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
    hasEditPermission = false,
    focusedDate = $bindable(null),
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();

  let editingStepId = $state<string | null>(null);
  let editedStep = $state<Partial<Step>>({});
  let editStepHour = $state("09");
  let editStepMinute = $state("00");

  // Carousel management
  let activeIndex = $state(0);
  let trackEl = $state<HTMLDivElement | null>(null);
  let touchStartX = $state<number | null>(null);
  let touchDeltaX = $state(0);

  $effect(() => {
    if (editingStepId && editStepHour && editStepMinute) {
      editedStep.time = `${editStepHour}:${editStepMinute}`;
    }
  });

  // Initialize activeIndex to the closest date to today
  $effect(() => {
    const groups = groupedSteps();
    if (groups.length === 0) return;

    const today = new Date().toISOString().split("T")[0];
    let closestIndex = 0;
    let minDiff = Infinity;

    groups.forEach(([date], index) => {
      const diff = Math.abs(
        new Date(date).getTime() - new Date(today).getTime(),
      );
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = index;
      }
    });

    activeIndex = closestIndex;
  });

  // Update focusedDate when activeIndex changes
  $effect(() => {
    const groups = groupedSteps();
    if (groups.length > 0 && groups[activeIndex]) {
      focusedDate = groups[activeIndex][0];
    }
  });

  // Group steps by date
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

  // Navigate to card on click
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

  // Configure marked for safe rendering
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // Enable GitHub Flavored Markdown
  });

  // Function to render markdown safely
  function renderMarkdown(text: string): string {
    return marked.parse(text, { async: false }) as string;
  }
</script>

{#if steps.length === 0}
  <div class="standard-autumn-empty">予定がまだ登録されていません</div>
{:else}
  <div class="standard-autumn-carousel-wrapper">
    <!-- Top Carousel Controls -->
    {#if groupedSteps().length > 1}
      <div
        class="standard-autumn-carousel-controls standard-autumn-carousel-controls-top"
        tabindex="0"
        onkeydown={handleKey}
        role="toolbar"
        aria-label="カルーセル操作"
      >
        <button
          type="button"
          class="standard-autumn-carousel-btn"
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
        <div
          class="standard-autumn-page-dots"
          role="tablist"
          aria-label="日選択"
        >
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
          class="standard-autumn-carousel-btn"
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
    {/if}

    <div
      class="standard-autumn-carousel"
      role="region"
      aria-label="日カルーセル"
      ontouchstart={onTouchStart}
      ontouchmove={onTouchMove}
      ontouchend={onTouchEnd}
    >
      <div
        class="standard-autumn-carousel-track"
        bind:this={trackEl}
        style={`--active:${activeIndex};`}
      >
        {#each groupedSteps() as [date, dateSteps], idx}
          <section
            class="standard-autumn-carousel-card"
            aria-hidden={idx !== activeIndex}
            onclick={() => handleCardClick(idx)}
            role="button"
            tabindex="0"
          >
            <div class="standard-autumn-card">
              <header class="standard-autumn-card-header">
                {formatDate(date)}
              </header>
              <div class="standard-autumn-card-body">
                {#each dateSteps as step}
                  <div class="standard-autumn-timeline-item">
                    <div class="standard-autumn-step-time">{step.time}</div>
                    <div class="standard-autumn-timeline-line"></div>
                    <div class="standard-autumn-step-dot"></div>

                    {#if editingStepId === step.id}
                      <!-- ... editing form ... -->
                      <div class="standard-autumn-step-editing">
                        <h3 class="standard-autumn-form-title">予定を編集</h3>
                        <!-- ... form fields ... -->
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
                              <span class="standard-autumn-time-separator"
                                >:</span
                              >
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
                            rows="3"
                          ></textarea>
                        </div>
                        <div class="standard-autumn-form-actions">
                          <button
                            onclick={handleUpdate}
                            class="standard-autumn-btn standard-autumn-btn-primary"
                            >保存</button
                          >
                          <button
                            onclick={cancelEdit}
                            class="standard-autumn-btn standard-autumn-btn-secondary"
                            >キャンセル</button
                          >
                        </div>
                      </div>
                    {:else if step.is_hidden}
                      <div
                        class="standard-autumn-step-content standard-autumn-step-hidden"
                      >
                        <div class="standard-autumn-step-title">
                          <span class="standard-autumn-secret-text"
                            >Secret Event</span
                          >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            width="18"
                            height="18"
                            class="standard-autumn-lock-icon"
                          >
                            <path
                              d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
                            />
                          </svg>

                          {#if hasEditPermission}
                            <div class="standard-autumn-step-actions">
                              <button
                                onclick={() => startEdit(step)}
                                class="standard-autumn-btn-icon"
                                title="編集"
                                aria-label="編集"
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
                            </div>
                          {/if}
                        </div>
                        <div class="standard-autumn-secret-blur">
                          <div class="standard-autumn-secret-line"></div>
                          <div class="standard-autumn-secret-line short"></div>
                        </div>
                      </div>
                    {:else}
                      <div class="standard-autumn-step-content">
                        <div class="standard-autumn-step-title">
                          {step.title}
                          {#if hasEditPermission}
                            <div class="standard-autumn-step-actions">
                              <button
                                onclick={() => startEdit(step)}
                                class="standard-autumn-btn-icon"
                                title="編集"
                                aria-label="編集"
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
                                class="standard-autumn-btn-icon"
                                title="削除"
                                aria-label="削除"
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
                          {/if}
                        </div>
                        {#if step.location}
                          <div class="standard-autumn-step-location">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              class="standard-autumn-icon-location"
                            >
                              <path
                                d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                              />
                            </svg>
                            {step.location}
                          </div>
                        {/if}
                        {#if step.notes}
                          <!-- svelte-ignore a11y_click_events_have_key_events -->
                          <!-- svelte-ignore a11y_no_static_element_interactions -->
                          <div
                            class="standard-autumn-step-notes"
                            onclick={(e) => {
                              // Allow link clicks to propagate
                              if ((e.target as HTMLElement).tagName === "A") {
                                e.stopPropagation();
                              }
                            }}
                          >
                            {@html renderMarkdown(step.notes)}
                          </div>
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

    <!-- Bottom Carousel Controls -->
    {#if groupedSteps().length > 1}
      <div
        class="standard-autumn-carousel-controls standard-autumn-carousel-controls-bottom"
        tabindex="0"
        onkeydown={handleKey}
        role="toolbar"
        aria-label="カルーセル操作"
      >
        <button
          type="button"
          class="standard-autumn-carousel-btn"
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
        <div
          class="standard-autumn-page-dots"
          role="tablist"
          aria-label="日選択"
        >
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
          class="standard-autumn-carousel-btn"
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
    {/if}
  </div>
{/if}
