<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import {
    getStepDate,
    getStepTime,
    createTimestamp,
    createEndTimestamp,
  } from "@tabitabi/types";
  import { getMemoText, updateMemoText } from "$lib/memo";
  import { renderMarkdown } from "./utils/markdown";
  import {
    EditIcon,
    DeleteIcon,
    LocationIcon,
    LockIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
  } from "./components/icons/index.svelte";
  import IconRenderer from "./icons/IconRenderer.svelte";
  import { type ViewMode } from "./utils/storage";
  import { ListView, MonthView, WeekView } from "./views";
  import EventDetailDialog from "./components/EventDetailDialog.svelte";

  interface Props {
    steps: Step[];
    hasEditPermission?: boolean;
    focusedDate?: string | null;
    secretModeEnabled?: boolean;
    secretModeOffset?: number;
    viewMode?: ViewMode;
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
    hasEditPermission = false,
    focusedDate = $bindable(null),
    secretModeEnabled = false,
    secretModeOffset = 60,
    viewMode = "dayCard",
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();

  function isSecretStep(step: Step): boolean {
    if (!secretModeEnabled) return false;
    const now = Date.now();
    const revealTime = step.start_at - secretModeOffset * 60 * 1000;
    return now < revealTime;
  }

  let editingStepId = $state<string | null>(null);
  let selectedStepForDialog = $state<Step | null>(null);

  let trackEl = $state<HTMLDivElement | null>(null);
  let touchStartX = $state<number | null>(null);
  let touchDeltaX = $state(0);

  let draggedStepId = $state<string | null>(null);
  let dragOverStepId = $state<string | null>(null);

  let touchDragStepId = $state<string | null>(null);
  let touchStartY = $state<number | null>(null);
  let touchCurrentY = $state<number | null>(null);

  function computeGroupedSteps(stepList: Step[]): [string, Step[]][] {
    const groups = new Map<string, Step[]>();
    for (const step of stepList) {
      const date = getStepDate(step);
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date)!.push(step);
    }
    for (const [_, groupSteps] of groups) {
      groupSteps.sort((a, b) => a.start_at - b.start_at);
    }
    return Array.from(groups.entries()).sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
  }

  function getInitialIndex(groups: [string, Step[]][]): number {
    if (groups.length === 0) return 0;
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
    return closestIndex;
  }

  let activeIndex = $state(getInitialIndex(computeGroupedSteps(steps)));

  const groupedSteps = $derived(() => computeGroupedSteps(steps));

  $effect(() => {
    const groups = groupedSteps();
    if (groups.length > 0 && groups[activeIndex]) {
      focusedDate = groups[activeIndex][0];
    }
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
    if (e.key === "ArrowRight") next();
    if (e.key === "ArrowLeft") prev();
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

  function handleCardClick(index: number) {
    if (index !== activeIndex) {
      goTo(index);
    }
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", { month: "long", day: "numeric" });
  }

  function handleStepClick(stepId: string) {
    const step = steps.find((s) => s.id === stepId);
    if (step) {
      selectedStepForDialog = step;
    }
  }

  function closeDetailDialog() {
    selectedStepForDialog = null;
  }

  function handleDragStart(e: DragEvent, stepId: string) {
    if (!hasEditPermission) return;
    draggedStepId = stepId;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  }

  function handleDragOver(e: DragEvent, stepId: string) {
    if (!hasEditPermission || !draggedStepId) return;
    e.preventDefault();
    dragOverStepId = stepId;
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  }

  function handleDragLeave() {
    dragOverStepId = null;
  }

  function handleDragEnd() {
    draggedStepId = null;
    dragOverStepId = null;
  }

  async function handleDrop(
    e: DragEvent,
    targetStepId: string,
    dateSteps: Step[],
  ) {
    e.preventDefault();
    if (
      !hasEditPermission ||
      !draggedStepId ||
      draggedStepId === targetStepId ||
      !onUpdateStep
    ) {
      draggedStepId = null;
      dragOverStepId = null;
      return;
    }

    const draggedIndex = dateSteps.findIndex((s) => s.id === draggedStepId);
    const targetIndex = dateSteps.findIndex((s) => s.id === targetStepId);

    if (draggedIndex === -1 || targetIndex === -1) {
      draggedStepId = null;
      dragOverStepId = null;
      return;
    }

    // Calculate new time for the dragged step
    const targetDate = getStepDate(dateSteps[targetIndex]);
    const targetTime = getStepTime(dateSteps[targetIndex]);

    const targetTimestamp = createTimestamp(targetDate, targetTime);

    try {
      // Only update the dragged step's time to match the target position
      await onUpdateStep(draggedStepId, {
        start_at: targetTimestamp,
      });
    } catch (error) {
      console.error("Failed to update step time:", error);
      alert("予定の時間の更新に失敗しました");
    }

    draggedStepId = null;
    dragOverStepId = null;
  }

  // Touch event handlers for mobile drag and drop
  function handleTouchDragStart(e: TouchEvent, stepId: string) {
    if (!hasEditPermission) return;
    touchDragStepId = stepId;
    touchStartY = e.touches[0].clientY;
    touchCurrentY = touchStartY;
  }

  function handleTouchDragMove(e: TouchEvent) {
    if (!touchDragStepId || !touchStartY) return;
    touchCurrentY = e.touches[0].clientY;
    const deltaY = touchCurrentY - touchStartY;

    // Find the element being dragged
    const target = e.target as HTMLElement;
    const timelineItem = target.closest(".standard-autumn-timeline-item");
    if (timelineItem && Math.abs(deltaY) > 5) {
      e.preventDefault(); // Prevent scrolling when dragging
    }
  }

  async function handleTouchDragEnd(e: TouchEvent, dateSteps: Step[]) {
    if (!touchDragStepId || touchStartY === null || touchCurrentY === null) {
      touchDragStepId = null;
      touchStartY = null;
      touchCurrentY = null;
      return;
    }

    const deltaY = touchCurrentY - touchStartY;

    // Only proceed if moved more than 30px
    if (Math.abs(deltaY) < 30) {
      touchDragStepId = null;
      touchStartY = null;
      touchCurrentY = null;
      return;
    }

    // Find the dragged step index
    const draggedIndex = dateSteps.findIndex((s) => s.id === touchDragStepId);
    if (draggedIndex === -1 || !onUpdateStep) {
      touchDragStepId = null;
      touchStartY = null;
      touchCurrentY = null;
      return;
    }

    // Determine target index based on direction
    let targetIndex = draggedIndex;
    if (deltaY < 0) {
      // Moved up
      targetIndex = Math.max(0, draggedIndex - 1);
    } else {
      // Moved down
      targetIndex = Math.min(dateSteps.length - 1, draggedIndex + 1);
    }

    // If no actual move, bail out
    if (targetIndex === draggedIndex) {
      touchDragStepId = null;
      touchStartY = null;
      touchCurrentY = null;
      return;
    }

    // Get target time
    const targetDate = getStepDate(dateSteps[targetIndex]);
    const targetTime = getStepTime(dateSteps[targetIndex]);

    const targetTimestamp = createTimestamp(targetDate, targetTime);

    try {
      await onUpdateStep(touchDragStepId, {
        start_at: targetTimestamp,
      });
    } catch (error) {
      console.error("Failed to update step time:", error);
      alert("予定の時間の更新に失敗しました");
    }

    touchDragStepId = null;
    touchStartY = null;
    touchCurrentY = null;
  }

  // Action to handle touch events with passive: false
  function setupTouchDrag(node: HTMLElement, stepId: string) {
    const handleStart = (e: TouchEvent) => handleTouchDragStart(e, stepId);
    const handleMove = (e: TouchEvent) => handleTouchDragMove(e);
    const handleEnd = (e: TouchEvent) => {
      // We need to pass the current dateSteps. Since this is inside an action,
      // we need to access the current state.
      // However, for simplicity in this context, we can rely on the component state
      // or pass a function that gets the current steps.
      // Here we'll use a slightly different approach for the end handler
      // or just pass the steps from the component scope if available.
      // A better way is to update the action parameters when steps change,
      // but for now let's try to use the component's dateSteps if accessible
      // or just pass the steps to the action.

      // Actually, handleTouchDragEnd needs dateSteps.
      // Let's find the dateSteps for this stepId.
      const stepObj = steps.find((s) => s.id === stepId);
      const date = stepObj ? getStepDate(stepObj) : null;
      if (date) {
        const dateSteps = groupedSteps().find(([d]) => d === date)?.[1] || [];
        handleTouchDragEnd(e, dateSteps);
      }
    };

    node.addEventListener("touchstart", handleStart, { passive: true });
    node.addEventListener("touchmove", handleMove, { passive: false });
    node.addEventListener("touchend", handleEnd);

    return {
      update(newStepId: string) {
        stepId = newStepId;
      },
      destroy() {
        node.removeEventListener("touchstart", handleStart);
        node.removeEventListener("touchmove", handleMove);
        node.removeEventListener("touchend", handleEnd);
      },
    };
  }
</script>

{#if viewMode === "list"}
  <ListView
    {steps}
    {hasEditPermission}
    {secretModeEnabled}
    {secretModeOffset}
    {onUpdateStep}
    {onDeleteStep}
    onStepClick={handleStepClick}
  />
{:else if viewMode === "month"}
  <MonthView
    {steps}
    {hasEditPermission}
    {secretModeEnabled}
    {secretModeOffset}
    {onUpdateStep}
    {onDeleteStep}
    onStepClick={handleStepClick}
  />
{:else if viewMode === "week"}
  <WeekView
    {steps}
    {hasEditPermission}
    {secretModeEnabled}
    {secretModeOffset}
    {onUpdateStep}
    {onDeleteStep}
    onStepClick={handleStepClick}
  />
{:else if steps.length === 0}
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
          <div
            class="standard-autumn-carousel-card"
            inert={idx !== activeIndex ? true : undefined}
          >
            <div class="standard-autumn-card">
              <button
                type="button"
                class="standard-autumn-card-header"
                onclick={() => handleCardClick(idx)}
                tabindex={idx === activeIndex ? 0 : -1}
              >
                {formatDate(date)}
              </button>
              <div class="standard-autumn-card-body">
                {#each dateSteps as step}
                  <div
                    class="standard-autumn-timeline-item"
                    class:dragging={draggedStepId === step.id}
                    class:drag-over={dragOverStepId === step.id}
                    class:touch-dragging={touchDragStepId === step.id}
                    role="none"
                    draggable={hasEditPermission && !editingStepId}
                    ondragstart={(e) => handleDragStart(e, step.id)}
                    ondragover={(e) => handleDragOver(e, step.id)}
                    ondragleave={handleDragLeave}
                    ondragend={handleDragEnd}
                    ondrop={(e) => handleDrop(e, step.id, dateSteps)}
                    use:setupTouchDrag={step.id}
                  >
                    <div class="standard-autumn-step-time">
                      {getStepTime(step)}
                    </div>
                    <div class="standard-autumn-timeline-line"></div>
                    <div class="standard-autumn-step-dot"></div>

                    {#if isSecretStep(step) && !hasEditPermission}
                      <div
                        class="standard-autumn-step-content standard-autumn-step-hidden"
                        onclick={() => handleStepClick(step.id)}
                        role="button"
                        tabindex="0"
                        onkeydown={(e) =>
                          (e.key === "Enter" || e.key === " ") &&
                          handleStepClick(step.id)}
                        title="詳細を表示"
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
                        </div>
                        <div class="standard-autumn-secret-blur">
                          <div class="standard-autumn-secret-line"></div>
                          <div class="standard-autumn-secret-line short"></div>
                        </div>
                      </div>
                    {:else}
                      <div
                        class="standard-autumn-step-content"
                        onclick={() => handleStepClick(step.id)}
                        role="button"
                        tabindex="0"
                        onkeydown={(e) =>
                          (e.key === "Enter" || e.key === " ") &&
                          handleStepClick(step.id)}
                        title="詳細を表示"
                      >
                        <div class="standard-autumn-step-header">
                          <div class="standard-autumn-step-title">
                            {step.title}
                          </div>
                          <div class="standard-autumn-step-type-icon">
                            <IconRenderer type={step.type} size="sm" />
                          </div>
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
                          <div class="standard-autumn-step-notes">
                            {@html renderMarkdown(step.notes)}
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          </div>
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

  {#if selectedStepForDialog}
    <EventDetailDialog
      step={selectedStepForDialog}
      {hasEditPermission}
      {secretModeEnabled}
      {secretModeOffset}
      onClose={closeDetailDialog}
      {onUpdateStep}
      {onDeleteStep}
    />
  {/if}
{/if}
