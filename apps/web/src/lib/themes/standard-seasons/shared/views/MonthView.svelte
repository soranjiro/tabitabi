<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { renderMarkdown } from '../utils/markdown';

  interface Props {
    steps: Step[];
    hasEditPermission?: boolean;
    secretModeEnabled?: boolean;
    secretModeOffset?: number;
    onUpdateStep?: (stepId: string, data: Record<string, unknown>) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
  }

  let {
    steps,
    hasEditPermission = false,
    secretModeEnabled = false,
    secretModeOffset = 60,
  }: Props = $props();

  let currentDate = $state(new Date());
  let selectedDate = $state<string | null>(null);

  function isSecretStep(stepDate: string, stepTime: string): boolean {
    if (!secretModeEnabled) return false;
    const now = new Date();
    const stepDateTime = new Date(`${stepDate}T${stepTime}`);
    const revealTime = new Date(stepDateTime.getTime() - secretModeOffset * 60 * 1000);
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

  function getMonthDays(date: Date): Array<{ day: number; date: string; isCurrentMonth: boolean }> {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Array<{ day: number; date: string; isCurrentMonth: boolean }> = [];

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
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatMonthTitle(date: Date): string {
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  }

  function formatSelectedDate(dateStr: string): string {
    const date = new Date(dateStr);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${date.getMonth() + 1}月${date.getDate()}日（${days[date.getDay()]}）`;
  }

  function prevMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  }

  function nextMonth() {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
  }

  function selectDay(dateStr: string) {
    selectedDate = dateStr;
  }

  function isToday(dateStr: string): boolean {
    return dateStr === formatDateKey(new Date());
  }

  const monthDays = $derived(getMonthDays(currentDate));
  const selectedSteps = $derived(selectedDate ? stepsByDate().get(selectedDate) || [] : []);
</script>

<div class="standard-autumn-month-view">
  <div class="standard-autumn-month-header">
    <h2 class="standard-autumn-month-title">{formatMonthTitle(currentDate)}</h2>
    <div class="standard-autumn-month-nav">
      <button type="button" class="standard-autumn-month-nav-btn" onclick={prevMonth}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      <button type="button" class="standard-autumn-month-nav-btn" onclick={nextMonth}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>
  </div>

  <div class="standard-autumn-month-weekdays">
    <span>日</span>
    <span>月</span>
    <span>火</span>
    <span>水</span>
    <span>木</span>
    <span>金</span>
    <span>土</span>
  </div>

  <div class="standard-autumn-month-grid">
    {#each monthDays as dayInfo}
      <button
        type="button"
        class="standard-autumn-month-day"
        class:other-month={!dayInfo.isCurrentMonth}
        class:has-events={stepsByDate().has(dayInfo.date)}
        class:selected={selectedDate === dayInfo.date}
        class:today={isToday(dayInfo.date)}
        onclick={() => selectDay(dayInfo.date)}
      >
        {dayInfo.day}
      </button>
    {/each}
  </div>

  {#if selectedDate && selectedSteps.length > 0}
    <div class="standard-autumn-month-detail">
      <h3 class="standard-autumn-month-detail-title">{formatSelectedDate(selectedDate)}</h3>
      <ul class="standard-autumn-month-detail-list">
        {#each selectedSteps as step}
          {#if isSecretStep(step.date, step.time) && !hasEditPermission}
            <li class="standard-autumn-month-detail-item">
              <span class="standard-autumn-month-detail-time">{step.time}</span>
              <div class="standard-autumn-month-detail-content">
                <div class="standard-autumn-month-detail-step-title">🔒 Secret</div>
              </div>
            </li>
          {:else}
            <li class="standard-autumn-month-detail-item">
              <span class="standard-autumn-month-detail-time">{step.time}</span>
              <div class="standard-autumn-month-detail-content">
                <div class="standard-autumn-month-detail-step-title">{step.title}</div>
                {#if step.location}
                  <div class="standard-autumn-month-detail-location">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                    {step.location}
                  </div>
                {/if}
              </div>
            </li>
          {/if}
        {/each}
      </ul>
    </div>
  {/if}
</div>
