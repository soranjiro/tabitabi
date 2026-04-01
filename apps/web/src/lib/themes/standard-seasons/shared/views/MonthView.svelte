<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate, getStepTime } from "@tabitabi/types";
  import EventDetailDialog from "../components/EventDetailDialog.svelte";

  interface Props {
    steps: Step[];
    hasEditPermission?: boolean;
    secretModeEnabled?: boolean;
    secretModeOffset?: number;
    onStepClick?: (stepId: string) => void;
    onUpdateStep?: (
      stepId: string,
      data: Record<string, unknown>,
    ) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
  }

  let {
    steps,
    hasEditPermission = false,
    secretModeEnabled = false,
    secretModeOffset = 60,
    onStepClick,
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();

  let currentDate = $state(new Date());
  let selectedStep = $state<Step | null>(null);

  function isSecretStep(step: Step): boolean {
    if (!secretModeEnabled) return false;
    const now = Date.now();
    const revealTime = step.start_at - secretModeOffset * 60 * 1000;
    return now < revealTime;
  }

  function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getMonthDays(
    date: Date,
  ): Array<{ day: number; date: string; isCurrentMonth: boolean }> {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Array<{ day: number; date: string; isCurrentMonth: boolean }> =
      [];

    const startDayOfWeek = firstDay.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        day: prevDate.getDate(),
        date: formatDateKey(prevDate),
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const thisDate = new Date(year, month, d);
      days.push({
        day: d,
        date: formatDateKey(thisDate),
        isCurrentMonth: true,
      });
    }

    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const nextDate = new Date(year, month + 1, i);
        days.push({
          day: i,
          date: formatDateKey(nextDate),
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }

  function getStepEndDate(step: Step): string {
    const d = new Date(step.end_at);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const monthDays = $derived(getMonthDays(currentDate));

  const weeks = $derived(() => {
    const days = monthDays().map((d) => d.date);
    const res: string[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      res.push(days.slice(i, i + 7));
    }
    return res;
  });

  const monthEventSegments = $derived(() => {
    const days = monthDays().map((d) => d.date);
    const weeksCount = Math.ceil(days.length / 7);
    const weeksSegments: Array<any[]> = Array.from({ length: weeksCount }, () => []);

    for (const step of steps) {
      const startDate = getStepDate(step);
      const endDate = getStepEndDate(step);
      let startIdx = days.indexOf(startDate);
      let endIdx = days.indexOf(endDate);
      if (startIdx === -1 && endIdx === -1) continue;
      if (startIdx === -1) startIdx = 0;
      if (endIdx === -1) endIdx = days.length - 1;

      for (let w = 0; w < weeksCount; w++) {
        const weekStart = w * 7;
        const weekEnd = weekStart + 6;
        const segStart = Math.max(startIdx, weekStart);
        const segEnd = Math.min(endIdx, weekEnd);
        if (segStart <= segEnd) {
          const leftPercent = ((segStart - weekStart) / 7) * 100;
          const widthPercent = ((segEnd - segStart + 1) / 7) * 100;
          const segmentsForWeek = weeksSegments[w];
          let rowIndex = 0;
          while (true) {
            const rowOccupied = segmentsForWeek.filter((s) => s.rowIndex === rowIndex);
            const overlap = rowOccupied.some((s) => !(segEnd < s.startIdx || segStart > s.endIdx));
            if (!overlap) break;
            rowIndex++;
          }
          segmentsForWeek.push({ step, leftPercent, widthPercent, rowIndex, startIdx: segStart, endIdx: segEnd });
        }
      }
    }

    return weeksSegments;
  });

  function formatMonthTitle(date: Date): string {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  }

  function prevMonth() {
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1,
    );
  }

  function nextMonth() {
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1,
    );
  }

  function isToday(dateStr: string): boolean {
    return dateStr === formatDateKey(new Date());
  }

  function getDayOfWeek(dateStr: string): string {
    const date = new Date(dateStr);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return days[date.getDay()];
  }

  function handleEventClick(step: Step) {
    selectedStep = step;
  }

  function closeDialog() {
    selectedStep = null;
  }
</script>

<div class="standard-autumn-month-view">
  <div class="standard-autumn-month-header">
    <h2 class="standard-autumn-month-title">{formatMonthTitle(currentDate)}</h2>
    <div class="standard-autumn-month-nav">
      <button
        type="button"
        class="standard-autumn-month-nav-btn"
        onclick={prevMonth}
        aria-label="前の月"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
        </svg>
      </button>
      <button
        type="button"
        class="standard-autumn-month-nav-btn"
        onclick={nextMonth}
        aria-label="次の月"
      >
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
        </svg>
      </button>
    </div>
  </div>

  <div class="standard-autumn-month-container">
    <div class="standard-autumn-month-weekdays">
      <div class="standard-autumn-month-weekday">日</div>
      <div class="standard-autumn-month-weekday">月</div>
      <div class="standard-autumn-month-weekday">火</div>
      <div class="standard-autumn-month-weekday">水</div>
      <div class="standard-autumn-month-weekday">木</div>
      <div class="standard-autumn-month-weekday">金</div>
      <div class="standard-autumn-month-weekday">土</div>
    </div>

    <div class="standard-autumn-month-grid">
      {#each weeks() as weekDays, wIdx}
        <div class="standard-autumn-month-week" style="position: relative; display: grid; grid-template-columns: repeat(7, 1fr);">
          {#each weekDays as dateStr}
            {@const dayInfo = monthDays().find(d => d.date === dateStr)}
            <div
              class="standard-autumn-month-day"
              class:other-month={!dayInfo?.isCurrentMonth}
              class:today={isToday(dateStr)}
            >
              <div class="standard-autumn-month-day-header">
                <span class="standard-autumn-month-day-number">{dayInfo?.day}</span>
              </div>
            </div>
          {/each}

          <div class="standard-autumn-month-week-events" style="position:absolute; left:0; right:0; top:36px;">
            {#each (monthEventSegments()[wIdx] || []) as seg}
              <button
                type="button"
                class="standard-autumn-month-event"
                style={`position:absolute; left:${seg.leftPercent}%; width:${seg.widthPercent}%; top:${seg.rowIndex * 24}px;`}
                onclick={() => handleEventClick(seg.step)}
                title={seg.step.title}
              >
                {#if isSecretStep(seg.step) && !hasEditPermission}
                  <span class="standard-autumn-month-event-time">🔒</span>
                {:else}
                  <span class="standard-autumn-month-event-time">{getStepTime(seg.step)}</span>
                  <span class="standard-autumn-month-event-title">{seg.step.title}</span>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

{#if selectedStep}
  <EventDetailDialog
    step={selectedStep}
    {hasEditPermission}
    onClose={closeDialog}
    {onUpdateStep}
    {onDeleteStep}
  />
{/if}
