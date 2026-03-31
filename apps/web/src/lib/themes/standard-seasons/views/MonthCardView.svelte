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

  function getInitialMonth(): { year: number; month: number } {
    if (steps.length > 0) {
      const sorted = [...steps].sort((a, b) => a.date.localeCompare(b.date));
      const [y, m] = sorted[0].date.split('-').map(Number);
      return { year: y, month: m };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  let currentYear = $state(getInitialMonth().year);
  let currentMonth = $state(getInitialMonth().month);

  const monthDays = $derived(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    });
  });

  const daysWithSteps = $derived(() => {
    const stepDates = new Set(steps.map(s => s.date));
    return monthDays().filter(d => stepDates.has(d));
  });

  function getStepsForDate(dateStr: string): Step[] {
    return steps.filter(s => s.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  }

  function formatDateLabel(dateStr: string): string {
    const [, m, d] = dateStr.split('-').map(Number);
    const date = new Date(currentYear, m - 1, d);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${m}月${d}日 (${days[date.getDay()]})`;
  }

  function prevMonth() {
    if (currentMonth === 1) { currentMonth = 12; currentYear--; }
    else currentMonth--;
  }

  function nextMonth() {
    if (currentMonth === 12) { currentMonth = 1; currentYear++; }
    else currentMonth++;
  }

  let draggedStepId = $state<string | null>(null);
  let dragOverDate = $state<string | null>(null);

  function onDragStart(e: DragEvent, stepId: string) {
    draggedStepId = stepId;
    e.dataTransfer?.setData('text/plain', stepId);
  }

  function onDragOver(e: DragEvent, dateStr: string) {
    e.preventDefault();
    dragOverDate = dateStr;
  }

  function onDragLeave() {
    dragOverDate = null;
  }

  async function onDrop(e: DragEvent, dateStr: string) {
    e.preventDefault();
    dragOverDate = null;
    if (!draggedStepId || !onUpdateStep) return;
    const dragged = steps.find(s => s.id === draggedStepId);
    if (!dragged || dragged.date === dateStr) return;
    await onUpdateStep(draggedStepId, { date: dateStr });
    draggedStepId = null;
  }

  function onDragEnd() {
    draggedStepId = null;
    dragOverDate = null;
  }
</script>

<div class="ss-month-card-view">
  <div class="ss-month-nav">
    <button class="ss-nav-arrow" onclick={prevMonth} aria-label="前の月">‹</button>
    <span class="ss-month-header">{currentYear}年{currentMonth}月</span>
    <button class="ss-nav-arrow" onclick={nextMonth} aria-label="次の月">›</button>
  </div>

  {#if daysWithSteps().length === 0}
    <div class="ss-empty">この月に予定はありません</div>
  {:else}
    <div class="ss-month-cards">
      {#each daysWithSteps() as dateStr}
        {@const daySteps = getStepsForDate(dateStr)}
        <div
          class="ss-month-day-card {dragOverDate === dateStr ? 'ss-drop-zone--active' : ''}"
          ondragover={(e) => onDragOver(e, dateStr)}
          ondragleave={onDragLeave}
          ondrop={(e) => onDrop(e, dateStr)}
        >
          <div class="ss-month-day-header">{formatDateLabel(dateStr)}</div>
          {#each daySteps as step (step.id)}
            <div
              class="ss-step-item"
              draggable={hasEditPermission}
              ondragstart={(e) => onDragStart(e, step.id)}
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
        </div>
      {/each}
    </div>
  {/if}
</div>
