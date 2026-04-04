<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate, getStepTime, getStepEndTime } from "@tabitabi/types";
  import EventDetailDialog from "../components/EventDetailDialog.svelte";
  import IconRenderer from "../icons/IconRenderer.svelte";
  import { isTransportType } from "../utils/step-type";

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
    if (steps.length === 0) return [];

    let minDay = Infinity;
    let maxDay = -Infinity;

    for (const s of steps) {
      const sd = new Date(s.start_at);
      sd.setHours(0, 0, 0, 0);
      const ed = new Date(s.end_at);
      ed.setHours(0, 0, 0, 0);
      minDay = Math.min(minDay, sd.getTime());
      maxDay = Math.max(maxDay, ed.getTime());
    }

    const weekDates: Date[] = [];
    const current = new Date(minDay);
    while (current.getTime() <= maxDay) {
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

  function getOverlappingStepsForDay(
    dateStr: string,
  ): Array<{ step: Step; index: number; totalCount: number }> {
    const DAY_START = new Date(`${dateStr}T00:00:00`).getTime();
    const DAY_END = DAY_START + 24 * 60 * 60 * 1000;

    const daySteps = steps.filter(
      (s) => s.start_at < DAY_END && s.end_at > DAY_START,
    );

    const enriched = daySteps.map((s) => {
      const relStart = Math.max(
        0,
        Math.floor((Math.max(s.start_at, DAY_START) - DAY_START) / 60000),
      );
      const relEnd = Math.min(
        24 * 60,
        Math.ceil((Math.min(s.end_at, DAY_END) - DAY_START) / 60000),
      );
      return { step: s, relStart, relEnd };
    });

    enriched.sort((a, b) => a.relStart - b.relStart || a.relEnd - b.relEnd);

    const positioned: {
      step: Step;
      index: number;
      totalCount: number;
      relStart: number;
      relEnd: number;
    }[] = [];

    for (const item of enriched) {
      const conflicting = enriched.filter(
        (o) =>
          o.step !== item.step &&
          !(o.relEnd <= item.relStart || o.relStart >= item.relEnd),
      );

      const assignedIndex = conflicting.filter(
        (o) => o.relStart < item.relStart,
      ).length;
      const maxOverlapCount = Math.max(1, conflicting.length + 1);

      positioned.push({
        step: item.step,
        index: assignedIndex,
        totalCount: maxOverlapCount,
        relStart: item.relStart,
        relEnd: item.relEnd,
      });
    }

    return positioned;
  }

  function getEventsForCell(
    dateStr: string,
    hour: number,
  ): Array<{ step: Step; index: number; totalCount: number }> {
    const hourStart = hour * 60;
    const hourEnd = (hour + 1) * 60;
    const dayPositions = getOverlappingStepsForDay(dateStr) as Array<{
      step: Step;
      index: number;
      totalCount: number;
      relStart: number;
      relEnd: number;
    }>;

    return dayPositions.filter(({ relStart, relEnd }) => {
      return relStart < hourEnd && relEnd > hourStart;
    });
  }

  function getEventStyle(
    step: Step,
    index: number,
    totalCount: number,
    relStart: number,
    relEnd: number,
  ): string {
    const topOffset = ((relStart % 60) / 60) * 40;
    const durationMinutes = Math.max(15, relEnd - relStart);
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
            class:has-events={getOverlappingStepsForDay(formatDateKey(date))
              .length > 0}
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
              {#each getEventsForCell(formatDateKey(date), hour) as { step, index, totalCount, relStart, relEnd }}
                {#if isSecretStep(step) && !hasEditPermission}
                  <button
                    type="button"
                    class="standard-autumn-week-event"
                    style={getEventStyle(
                      step,
                      index,
                      totalCount,
                      relStart,
                      relEnd,
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
                    class:standard-autumn-week-event-transport={isTransportType(
                      step.type,
                    )}
                    style={getEventStyle(
                      step,
                      index,
                      totalCount,
                      relStart,
                      relEnd,
                    )}
                    title={step.title}
                    onclick={() => handleEventClick(step)}
                  >
                    <span class="standard-autumn-week-event-icon">
                      <IconRenderer type={step.type} size="sm" />
                    </span>
                    <span class="standard-autumn-week-event-title">
                      {step.title}
                    </span>
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
    {secretModeEnabled}
    {secretModeOffset}
    onClose={closeDialog}
    {onUpdateStep}
    {onDeleteStep}
  />
{/if}
