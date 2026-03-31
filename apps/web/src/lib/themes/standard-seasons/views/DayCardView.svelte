<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    steps: Step[];
    hasEditPermission: boolean;
    onUpdateStep: ((stepId: string, data: { title?: string; date?: string; time?: string; location?: string; notes?: string }) => Promise<void>) | undefined;
    onDeleteStep: ((stepId: string) => Promise<void>) | undefined;
    onEditStep: (step: Step) => void;
    onSelectStep: (step: Step) => void;
  }

  let { steps, hasEditPermission, onUpdateStep, onEditStep, onSelectStep }: Props = $props();

  let currentDayIndex = $state(0);
  let draggedStepId = $state<string | null>(null);
  let dragOverStepId = $state<string | null>(null);

  const dayGroups = $derived(() => {
    const groups: Map<string, Step[]> = new Map();
    for (const step of steps) {
      if (!groups.has(step.date)) groups.set(step.date, []);
      groups.get(step.date)!.push(step);
    }
    for (const [, stepsInDay] of groups) {
      stepsInDay.sort((a, b) => a.time.localeCompare(b.time));
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  });

  const currentDaySteps = $derived(dayGroups()[currentDayIndex]?.[1] ?? []);
  const currentDayDate = $derived(dayGroups()[currentDayIndex]?.[0] ?? '');

  function formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    return `${month}月${day}日 (${dayNames[date.getDay()]})`;
  }

  function prevDay() {
    if (currentDayIndex > 0) currentDayIndex--;
  }

  function nextDay() {
    if (currentDayIndex < dayGroups().length - 1) currentDayIndex++;
  }

  function onDragStart(e: DragEvent, stepId: string) {
    draggedStepId = stepId;
    e.dataTransfer?.setData('text/plain', stepId);
  }

  function onDragOver(e: DragEvent, stepId: string) {
    e.preventDefault();
    dragOverStepId = stepId;
  }

  function onDragLeave() {
    dragOverStepId = null;
  }

  async function onDrop(e: DragEvent, targetStepId: string) {
    e.preventDefault();
    dragOverStepId = null;
    if (!draggedStepId || draggedStepId === targetStepId || !onUpdateStep) return;
    const dragged = currentDaySteps.find(s => s.id === draggedStepId);
    const target = currentDaySteps.find(s => s.id === targetStepId);
    if (!dragged || !target) return;
    await onUpdateStep(draggedStepId, { time: target.time });
    await onUpdateStep(targetStepId, { time: dragged.time });
    draggedStepId = null;
  }

  function onDragEnd() {
    draggedStepId = null;
    dragOverStepId = null;
  }
</script>

<div class="ss-day-card-view">
  {#if dayGroups().length === 0}
    <div class="ss-empty">予定がありません</div>
  {:else}
    <div class="ss-day-nav">
      <button class="ss-nav-arrow" onclick={prevDay} disabled={currentDayIndex === 0} aria-label="前の日">‹</button>
      <span class="ss-day-header">{formatDate(currentDayDate)}</span>
      <button class="ss-nav-arrow" onclick={nextDay} disabled={currentDayIndex === dayGroups().length - 1} aria-label="次の日">›</button>
    </div>

    <div class="ss-dot-indicators">
      {#each dayGroups() as _, i}
        <button
          class="ss-dot {i === currentDayIndex ? 'ss-dot--active' : ''}"
          onclick={() => (currentDayIndex = i)}
          aria-label={`${i + 1}日目`}
        ></button>
      {/each}
    </div>

    <div class="ss-timeline">
      {#each currentDaySteps as step (step.id)}
        <div
          class="ss-step-item {dragOverStepId === step.id ? 'ss-drop-zone--active' : ''}"
          draggable={hasEditPermission}
          ondragstart={(e) => onDragStart(e, step.id)}
          ondragover={(e) => onDragOver(e, step.id)}
          ondragleave={onDragLeave}
          ondrop={(e) => onDrop(e, step.id)}
          ondragend={onDragEnd}
          onclick={() => onSelectStep(step)}
          role="button"
          tabindex="0"
          onkeydown={(e) => e.key === 'Enter' && onSelectStep(step)}
        >
          <span class="ss-step-time">{step.time}</span>
          <div class="ss-step-body">
            <span class="ss-step-title">{step.title}</span>
            {#if step.location}
              <span class="ss-step-location">{step.location}</span>
            {/if}
          </div>
          {#if hasEditPermission}
            <button
              class="ss-edit-btn"
              onclick={(e) => { e.stopPropagation(); onEditStep(step); }}
              aria-label="編集"
            >✏️</button>
          {/if}
        </div>
      {/each}
      {#if currentDaySteps.length === 0}
        <div class="ss-empty-day">この日の予定はありません</div>
      {/if}
    </div>
  {/if}
</div>
