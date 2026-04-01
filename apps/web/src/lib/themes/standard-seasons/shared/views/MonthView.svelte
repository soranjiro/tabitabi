<script lang="ts">
  import type { Step } from "@tabitabi/types";
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

  function isSecretStep(stepDate: string, stepTime: string): boolean {
    if (!secretModeEnabled) return false;
    const now = new Date();
    const stepDateTime = new Date(`${stepDate}T${stepTime}`);
    const revealTime = new Date(
      stepDateTime.getTime() - secretModeOffset * 60 * 1000,
    );
    return now < revealTime;
  }

  const stepsByDate = $derived(() => {
    const map = new Map<string, Step[]>();
    for (const step of steps) {
      const date = step.date;
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(step);
    }
    for (const [_, stepList] of map) {
      stepList.sort((a, b) => a.time.localeCompare(b.time));
    }
    return map;
  });

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

  function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

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

  const monthDays = $derived(getMonthDays(currentDate));
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
      {#each monthDays as dayInfo}
        <div
          class="standard-autumn-month-day"
          class:other-month={!dayInfo.isCurrentMonth}
          class:today={isToday(dayInfo.date)}
        >
          <div class="standard-autumn-month-day-header">
            <span class="standard-autumn-month-day-number">{dayInfo.day}</span>
          </div>
          <div class="standard-autumn-month-day-content">
            {#each stepsByDate().get(dayInfo.date) || [] as step, idx}
              {#if idx < 3}
                <button
                  type="button"
                  class="standard-autumn-month-event"
                  class:secret={isSecretStep(step.date, step.time) &&
                    !hasEditPermission}
                  onclick={() => handleEventClick(step)}
                  title={step.title}
                >
                  {#if isSecretStep(step.date, step.time) && !hasEditPermission}
                    <span class="standard-autumn-month-event-time">🔒</span>
                  {:else}
                    <span class="standard-autumn-month-event-time"
                      >{step.time}</span
                    >
                    <span class="standard-autumn-month-event-title"
                      >{step.title}</span
                    >
                  {/if}
                </button>
              {/if}
            {/each}
            {#if (stepsByDate().get(dayInfo.date) || []).length > 3}
              <div class="standard-autumn-month-more">
                +{(stepsByDate().get(dayInfo.date) || []).length - 3}件
              </div>
            {/if}
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
    onEditMode={closeDialog}
    {onUpdateStep}
    {onDeleteStep}
  />
{/if}
