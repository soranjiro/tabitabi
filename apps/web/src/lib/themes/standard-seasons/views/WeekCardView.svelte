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

  const DAY_NAMES = ['月', '火', '水', '木', '金', '土', '日'];

  function getMondayOf(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function toDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const initialMonday = $derived(() => {
    if (steps.length > 0) {
      const sorted = [...steps].sort((a, b) => a.date.localeCompare(b.date));
      const [y, mo, d] = sorted[0].date.split('-').map(Number);
      return getMondayOf(new Date(y, mo - 1, d));
    }
    return getMondayOf(new Date());
  });

  let weekStart = $state<Date | null>(null);

  $effect(() => {
    if (weekStart === null) {
      weekStart = initialMonday();
    }
  });

  const weekDays = $derived(() => {
    if (!weekStart) return [];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart!);
      d.setDate(weekStart!.getDate() + i);
      return d;
    });
  });

  const weekRange = $derived(() => {
    if (weekDays().length === 0) return '';
    const start = weekDays()[0];
    const end = weekDays()[6];
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 〜 ${end.getMonth() + 1}月${end.getDate()}日`;
  });

  function getStepsForDate(dateStr: string): Step[] {
    return steps.filter(s => s.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  }

  function prevWeek() {
    if (!weekStart) return;
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    weekStart = d;
  }

  function nextWeek() {
    if (!weekStart) return;
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    weekStart = d;
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

<div class="ss-week-card-view">
  <div class="ss-week-nav">
    <button class="ss-nav-arrow" onclick={prevWeek} aria-label="前の週">‹</button>
    <span class="ss-week-header">{weekRange()}</span>
    <button class="ss-nav-arrow" onclick={nextWeek} aria-label="次の週">›</button>
  </div>

  <div class="ss-week-columns">
    {#each weekDays() as day, i}
      {@const dateStr = toDateStr(day)}
      {@const daySteps = getStepsForDate(dateStr)}
      <div
        class="ss-week-col {dragOverDate === dateStr ? 'ss-drop-zone--active' : ''}"
        ondragover={(e) => onDragOver(e, dateStr)}
        ondragleave={onDragLeave}
        ondrop={(e) => onDrop(e, dateStr)}
      >
        <div class="ss-week-col-header">
          <span class="ss-week-day-name">{DAY_NAMES[i]}</span>
          <span class="ss-week-day-num">{day.getDate()}</span>
        </div>
        <div class="ss-week-col-steps">
          {#each daySteps as step (step.id)}
            <div
              class="ss-week-step"
              draggable={hasEditPermission}
              ondragstart={(e) => onDragStart(e, step.id)}
              ondragend={onDragEnd}
              onclick={() => onSelectStep(step)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && onSelectStep(step)}
            >
              <span class="ss-week-step-time">{step.time}</span>
              <span class="ss-week-step-title">{step.title}</span>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
