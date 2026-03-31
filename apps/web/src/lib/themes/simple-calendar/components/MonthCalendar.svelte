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
                    onkeydown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onEditStep?.(step);
                      }
                    }}
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
    padding: 12px 0;
  }

  .month-section {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 12px;
    background: white;
    margin: 0 12px;
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
    gap: 8px;
    margin-bottom: 12px;
  }

  .month-weekday {
    text-align: center;
    font-size: 13px;
    font-weight: 700;
    color: #1f2937;
    padding: 12px 0;
    border-bottom: 2px solid #e5e5e5;
  }

  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 8px;
    auto-rows: 120px;
  }

  .month-cell {
    border: 1px solid #e5e5e5;
    border-radius: 8px;
    padding: 12px;
    background: white;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: all 0.2s;
    cursor: pointer;
  }

  .month-cell:hover {
    border-color: #2563eb;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.1);
    transform: translateY(-2px);
  }

  .month-cell.has-steps {
    background: linear-gradient(135deg, #f9fbff 0%, #ffffff 100%);
  }

  .month-date {
    font-size: 14px;
    font-weight: 700;
    color: #1f2937;
    margin-bottom: 8px;
  }

  .month-cell-content {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .month-step-item {
    background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
    padding: 4px 8px;
    border-radius: 4px;
    color: #1e40af;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    gap: 4px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    transition: all 0.2s;
    font-size: 12px;
  }

  .month-step-item:hover {
    background: #bfdbfe;
    color: #0c4a6e;
    box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
  }

  .month-step-time {
    flex-shrink: 0;
    font-family: monospace;
    font-size: 11px;
    font-weight: 700;
  }

  .month-step-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 11px;
  }

  .month-step-more {
    color: #666;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 4px;
  }

  @media (max-width: 1024px) {
    .month-grid {
      gap: 6px;
      auto-rows: 100px;
    }

    .month-cell {
      padding: 8px;
    }

    .month-date {
      font-size: 12px;
      margin-bottom: 4px;
    }

    .month-step-item {
      font-size: 11px;
      padding: 2px 6px;
    }
  }

  @media (max-width: 480px) {
    .month-grid {
      gap: 4px;
      auto-rows: 80px;
    }

    .month-cell {
      padding: 6px;
    }

    .month-weekday {
      font-size: 11px;
      padding: 8px 0;
    }

    .month-date {
      font-size: 11px;
      margin-bottom: 4px;
    }

    .month-cell-content {
      gap: 2px;
    }

    .month-step-item {
      font-size: 9px;
      padding: 2px 4px;
    }
  }
</style>
