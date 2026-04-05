<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate, getStepEndDate } from "@tabitabi/types";
  import EventDetailDialog from "../components/EventDetailDialog.svelte";
  import IconRenderer from "../icons/IconRenderer.svelte";
  import { isTransportType } from "../utils/step-type";
  import {
    getWeekDatesFromSteps,
    getWeekHours,
    getOverlappingStepsForDay as utilGetOverlappingStepsForDay,
    getEventStyleForDay as utilGetEventStyleForDay,
  } from "./weekview-utils";

  import "../styles/WeekView.css";

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

  const weekDates = $derived(() => getWeekDatesFromSteps(steps));
  const hours = $derived(() =>
    getWeekHours(steps.filter((s) => !s.is_all_day)),
  );

  const timedSteps = $derived(() => steps.filter((s) => !s.is_all_day));

  function getAllDayStepsForDate(date: Date): Step[] {
    const dateStr = formatDateKey(date);
    const dayStart = new Date(`${dateStr}T00:00:00`).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    return steps.filter(
      (s) => s.is_all_day && s.start_at < dayEnd && s.end_at > dayStart,
    );
  }

  function isMultiDayStep(step: Step): boolean {
    return getStepDate(step) !== getStepEndDate(step);
  }

  const hasAnyAllDayEvents = $derived(() =>
    weekDates().some((d) => getAllDayStepsForDate(d).length > 0),
  );

  function handleEventClick(step: Step) {
    selectedStep = step;
  }

  function closeDialog() {
    selectedStep = null;
  }

  let numCols = $derived(weekDates().length);
</script>

<div class="standard-week-view" style="--week-cols: {numCols};">
  {#if weekDates().length === 0}
    <div class="standard-week-no-events">予定がまだ登録されていません</div>
  {:else}
    <div class="standard-week-container">
      <div class="standard-week-header">
        <div class="standard-week-corner"></div>
        {#each weekDates() as date}
          <div
            class="standard-week-day-header"
            class:has-events={utilGetOverlappingStepsForDay(
              timedSteps(),
              formatDateKey(date),
            ).length > 0 || getAllDayStepsForDate(date).length > 0}
          >
            <div class="standard-week-day-name">{getDayName(date)}</div>
            <div class="standard-week-day-date">
              {getDateDisplay(date)}
            </div>
          </div>
        {/each}
      </div>

      {#if hasAnyAllDayEvents()}
        <div class="standard-week-allday-row">
          <div class="standard-week-allday-label">終日</div>
          {#each weekDates() as date}
            <div class="standard-week-allday-cell">
              {#each getAllDayStepsForDate(date) as step}
                <button
                  type="button"
                  class="standard-week-allday-event"
                  class:standard-week-event-multiday={isMultiDayStep(step)}
                  class:standard-week-event-allday={step.is_all_day}
                  title={step.title}
                  onclick={() => handleEventClick(step)}
                >
                  <span class="standard-week-event-icon">
                    <IconRenderer type={step.type} size="sm" />
                  </span>
                  <span class="standard-week-event-title">
                    {step.title}
                  </span>
                </button>
              {/each}
            </div>
          {/each}
        </div>
      {/if}

      <div class="standard-week-body">
        {#each hours() as hour}
          <div class="standard-week-time-label">
            {String(hour).padStart(2, "0")}:00
          </div>
          {#each weekDates() as date}
            <div class="standard-week-cell"></div>
          {/each}
        {/each}

        <div
          class="standard-week-events-layer"
          style="--week-hour-rows: {hours().length};"
        >
          {#each weekDates() as date, dayIndex}
            <div
              class="standard-week-day-events"
              style="grid-column: {dayIndex + 2}; grid-row: 1 / span {hours()
                .length};"
            >
              {#each utilGetOverlappingStepsForDay(timedSteps(), formatDateKey(date)) as { step, index, totalCount, relStart, relEnd }}
                {#if isSecretStep(step) && !hasEditPermission}
                  <button
                    type="button"
                    class="standard-week-event"
                    class:standard-week-event-multiday={isMultiDayStep(step)}
                    class:standard-week-event-allday={step.is_all_day}
                    style={utilGetEventStyleForDay(
                      hours(),
                      relStart,
                      relEnd,
                      index,
                      totalCount,
                    )}
                    title="Secret"
                    onclick={() => handleEventClick(step)}
                  >
                    🔒 Secret
                  </button>
                {:else}
                  <button
                    type="button"
                    class="standard-week-event"
                    class:standard-week-event-transport={isTransportType(
                      step.type,
                    )}
                    class:standard-week-event-multiday={isMultiDayStep(step)}
                    class:standard-week-event-allday={step.is_all_day}
                    style={utilGetEventStyleForDay(
                      hours(),
                      relStart,
                      relEnd,
                      index,
                      totalCount,
                    )}
                    title={step.title}
                    onclick={() => handleEventClick(step)}
                  >
                    <span class="standard-week-event-icon">
                      <IconRenderer type={step.type} size="sm" />
                    </span>
                    <span class="standard-week-event-title">
                      {step.title}
                    </span>
                  </button>
                {/if}
              {/each}
            </div>
          {/each}
        </div>
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
