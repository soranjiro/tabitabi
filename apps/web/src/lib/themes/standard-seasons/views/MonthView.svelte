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

  let { steps, onSelectStep }: Props = $props();

  const DAY_NAMES = ['日', '月', '火', '水', '木', '金', '土'];

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

  interface CalendarCell {
    dateStr: string;
    day: number;
    isCurrentMonth: boolean;
  }

  const calendarCells = $derived((): CalendarCell[] => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const cells: CalendarCell[] = [];

    const startDow = firstDay.getDay();
    for (let i = 0; i < startDow; i++) {
      const d = new Date(currentYear, currentMonth - 1, -startDow + i + 1);
      cells.push({ dateStr: toDateStr(d), day: d.getDate(), isCurrentMonth: false });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push({
        dateStr: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        day: d,
        isCurrentMonth: true,
      });
    }

    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(currentYear, currentMonth, i);
        cells.push({ dateStr: toDateStr(d), day: d.getDate(), isCurrentMonth: false });
      }
    }

    return cells;
  });

  function toDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getStepsForDate(dateStr: string): Step[] {
    return steps.filter(s => s.date === dateStr).sort((a, b) => a.time.localeCompare(b.time));
  }

  function prevMonth() {
    if (currentMonth === 1) { currentMonth = 12; currentYear--; }
    else currentMonth--;
  }

  function nextMonth() {
    if (currentMonth === 12) { currentMonth = 1; currentYear++; }
    else currentMonth++;
  }
</script>

<div class="ss-month-view">
  <div class="ss-month-nav">
    <button class="ss-nav-arrow" onclick={prevMonth} aria-label="前の月">‹</button>
    <span class="ss-month-header">{currentYear}年{currentMonth}月</span>
    <button class="ss-nav-arrow" onclick={nextMonth} aria-label="次の月">›</button>
  </div>

  <div class="ss-calendar-grid ss-month-grid">
    {#each DAY_NAMES as name}
      <div class="ss-calendar-day-header">{name}</div>
    {/each}
    {#each calendarCells() as cell (cell.dateStr + cell.isCurrentMonth)}
      {@const cellSteps = getStepsForDate(cell.dateStr)}
      <div class="ss-calendar-cell {!cell.isCurrentMonth ? 'ss-calendar-cell--other-month' : ''}">
        <span class="ss-calendar-day-num">{cell.day}</span>
        <div class="ss-calendar-cell-steps">
          {#each cellSteps as step (step.id)}
            <div
              class="ss-calendar-step-tag"
              onclick={() => onSelectStep(step)}
              role="button"
              tabindex="0"
              onkeydown={(e) => e.key === 'Enter' && onSelectStep(step)}
              title={step.title}
            >
              {step.title}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
