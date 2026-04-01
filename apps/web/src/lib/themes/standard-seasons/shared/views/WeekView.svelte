<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate, getStepTime, getStepEndTime } from "@tabitabi/types";
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

  let selectedStep = $state<Step | null>(null);

  function isSecretStep(step: Step): boolean {
    if (!secretModeEnabled) return false;
    const now = Date.now();
    const revealTime = step.start_at - secretModeOffset * 60 * 1000;
    return now < revealTime;
  }

  function getWeekDates(): Date[] {
    const dates: string[] = [];
    for (const step of steps) {
      const date = getStepDate(step);
      if (!dates.includes(date)) {
        dates.push(date);
      }
    }
    dates.sort();

    if (dates.length === 0) return [];

    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);

    const weekDates: Date[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      weekDates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return weekDates;
  }

  function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function getDayName(date: Date): string {
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return days[date.getDay()];
  }

  function getDateDisplay(date: Date): string {
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  const stepsByDate = $derived(() => {
    const map = new Map<string, Step[]>();
    for (const step of steps) {
      const date = getStepDate(step);
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(step);
    }
    return map;
  });

  const weekDates = $derived(getWeekDates());

  const hours = Array.from({ length: 16 }, (_, i) => i + 6);

  function getEventsForCell(dateStr: string, hour: number): Step[] {
    const daySteps = stepsByDate().get(dateStr) || [];
    return daySteps.filter((step) => {
      const startHour = parseInt(getStepTime(step).split(":")[0], 10);
      return startHour === hour;
    });
  }

  function getEventStyle(
    step: Step,
    index: number,
    totalCount: number,
  ): string {
    const startTs = new Date(step.start_at);
    const endTs = new Date(step.end_at);

    const topOffset = (startTs.getMinutes() / 60) * 40;
    const durationMinutes = Math.max(
      15,
      Math.round((endTs.getTime() - startTs.getTime()) / 60000),
    );
    const height = Math.max((durationMinutes / 60) * 40, 38);
    const width = 100 / totalCount;
    const left = index * width;
    return `top: ${topOffset}px; height: ${height}px; left: ${left}%; width: ${width}%;`;
  }

  function getEventCountForCell(dateStr: string, hour: number): number {
    return getEventsForCell(dateStr, hour).length;
  }

  function handleEventClick(step: Step) {
    selectedStep = step;
  }

  function closeDialog() {
    selectedStep = null;
  }
</script>

<div class="standard-autumn-week-view">
  {#if weekDates.length === 0}
    <div class="standard-autumn-week-no-events">
      予定がまだ登録されていません
    </div>
  {:else}
    <div
      class="standard-autumn-week-container"
      style="grid-template-columns: 60px repeat({weekDates.length}, 1fr);"
    >
      <div class="standard-autumn-week-header">
        <div class="standard-autumn-week-corner"></div>
        {#each weekDates as date}
          <div
            class="standard-autumn-week-day-header"
            class:has-events={stepsByDate().has(formatDateKey(date))}
          >
            <div class="standard-autumn-week-day-name">{getDayName(date)}</div>
            <div class="standard-autumn-week-day-date">
              {getDateDisplay(date)}
            </div>
          </div>
        {/each}
      </div>

      <div class="standard-autumn-week-body">
        {#each hours as hour}
          <div class="standard-autumn-week-time-label">
            {String(hour).padStart(2, "0")}:00
          </div>
          {#each weekDates as date}
            <div class="standard-autumn-week-cell">
              {#each getEventsForCell(formatDateKey(date), hour) as step, idx}
                {#if isSecretStep(step) && !hasEditPermission}
                  <button
                    type="button"
                    class="standard-autumn-week-event"
                    style={getEventStyle(
                      step,
                      idx,
                      getEventCountForCell(formatDateKey(date), hour),
                    )}
                    title="Secret"
                    onclick={() => handleEventClick(step)}
                  >
                    🔒 Secret
                  </button>
                {:else}
                  <button
                    type="button"
                    class="standard-autumn-week-event"
                    style={getEventStyle(
                      step,
                      idx,
                      getEventCountForCell(formatDateKey(date), hour),
                    )}
                    title={step.title}
                    onclick={() => handleEventClick(step)}
                  >
                    {step.title}
                  </button>
                {/if}
              {/each}
            </div>
          {/each}
        {/each}
      </div>
    </div>
  {/if}
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
