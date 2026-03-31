<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getMemoText } from "$lib/memo";

  interface Props {
    steps: Step[];
    hasEditPermission?: boolean;
    onEditStep?: (step: Step) => void;
    onDeleteStep?: (stepId: string) => void;
  }

  let {
    steps,
    hasEditPermission = false,
    onEditStep,
    onDeleteStep,
  }: Props = $props();

  const groupedSteps = $derived.by(() => {
    const groups = new Map<string, Step[]>();
    for (const step of steps) {
      const date = step.date;
      if (!groups.has(date)) {
        groups.set(date, []);
      }
      groups.get(date)!.push(step);
    }

    for (const [_, groupSteps] of groups) {
      groupSteps.sort((a, b) => a.time.localeCompare(b.time));
    }

    return groups;
  });

  const monthsToDisplay = $derived.by(() => {
    if (steps.length === 0) {
      const today = new Date();
      return [{ year: today.getFullYear(), month: today.getMonth() }];
    }

    const dates = steps.map((s) => new Date(s.date));
    const minDate = dates.reduce((min, cur) => (cur < min ? cur : min));
    const maxDate = dates.reduce((max, cur) => (cur > max ? cur : max));

    const months: Array<{ year: number; month: number }> = [];
    let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endMonth = new Date(maxDate.getFullYear(), maxDate.getMonth() + 1, 1);

    while (current < endMonth) {
      months.push({ year: current.getFullYear(), month: current.getMonth() });
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  });

  function getDatesInMonth(year: number, month: number): Date[] {
    const dates: Date[] = [];
    let date = new Date(year, month, 1);
    while (date.getMonth() === month) {
      dates.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return dates;
  }

  function getStepsForDate(dateStr: string): Step[] {
    return groupedSteps.get(dateStr) || [];
  }
</script>

{#if monthsToDisplay && monthsToDisplay.length > 0}
  <div class="month-view-container">
    {#each monthsToDisplay as monthInfo (monthInfo.year * 12 + monthInfo.month)}
      <div class="month-section">
        <div class="month-header">
          {monthInfo.year}年{monthInfo.month + 1}月
        </div>
        <div class="month-weekdays">
          {#each ["日", "月", "火", "水", "木", "金", "土"] as dayName (dayName)}
            <div class="month-weekday">{dayName}</div>
          {/each}
        </div>
        <div class="month-grid">
          {#each getDatesInMonth(monthInfo.year, monthInfo.month) as date (date
            .toISOString()
            .split("T")[0])}
            {@const dateStr = date.toISOString().split("T")[0]}
            {@const dateSteps = getStepsForDate(dateStr)}
            <div class="month-cell" class:has-steps={dateSteps.length > 0}>
              <div class="month-date">{date.getDate()}</div>
              <div class="month-cell-content">
                {#each dateSteps.slice(0, 3) as step (step.id)}
                  <div
                    class="month-step-item"
                    title={step.title}
                    role="button"
                    tabindex="0"
                    onclick={() => onEditStep?.(step)}
                    ondblclick={() => onDeleteStep?.(step.id)}
                  >
                    <span class="month-step-time">{step.time}</span>
                    <span class="month-step-title"
                      >{step.title.substring(0, 12)}</span
                    >
                  </div>
                {/each}
                {#if dateSteps.length > 3}
                  <div class="month-step-more">+{dateSteps.length - 3}</div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .month-view-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .month-section {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 1rem;
    background: white;
  }

  .month-header {
    font-size: 14px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 12px;
    text-align: center;
  }

  .month-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    margin-bottom: 6px;
  }

  .month-weekday {
    text-align: center;
    font-size: 11px;
    font-weight: 600;
    color: #666;
    padding: 4px 0;
  }

  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    auto-rows: 70px;
  }

  .month-cell {
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    padding: 4px;
    background: white;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.2s;
  }

  .month-cell:hover {
    border-color: #2563eb;
    box-shadow: 0 1px 4px rgba(37, 99, 235, 0.1);
  }

  .month-cell.has-steps {
    background: #f9fbff;
  }

  .month-date {
    font-size: 11px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 2px;
  }

  .month-cell-content {
    flex: 1;
    overflow-y: auto;
    font-size: 9px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .month-step-item {
    background: #e0e7ff;
    padding: 1px 2px;
    border-radius: 2px;
    color: #2563eb;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    gap: 1px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    transition: all 0.2s;
  }

  .month-step-item:hover {
    background: #bfdbfe;
    color: #1d4ed8;
  }

  .month-step-time {
    flex-shrink: 0;
    font-family: monospace;
    font-size: 8px;
  }

  .month-step-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 8px;
  }

  .month-step-more {
    color: #666;
    font-size: 8px;
    font-weight: 600;
    padding: 1px 2px;
  }

  @media (max-width: 480px) {
    .month-view-container {
      gap: 1rem;
    }

    .month-section {
      padding: 0.75rem;
    }

    .month-grid {
      auto-rows: 60px;
    }

    .month-cell-content {
      font-size: 8px;
    }
  }
</style>
