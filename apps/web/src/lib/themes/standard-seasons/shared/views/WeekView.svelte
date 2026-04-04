<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate, getStepTime, getStepEndTime } from "@tabitabi/types";
  import EventDetailDialog from "../components/EventDetailDialog.svelte";
  import IconRenderer from "../icons/IconRenderer.svelte";
  import { isTransportType } from "../utils/step-type";
  import {
    getWeekDatesFromSteps,
    getOverlappingStepsForDay as utilGetOverlappingStepsForDay,
    getEventStyleForDay as utilGetEventStyleForDay,
    DEFAULT_HOURS,
  } from "./weekview-utils";

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

  // Week/date helpers moved to utils

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

  const weekDates = $derived(() => getWeekDatesFromSteps(steps));

  const hours = DEFAULT_HOURS;

  // helpers moved to weekview-utils.ts

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
            class:has-events={utilGetOverlappingStepsForDay(
              steps,
              formatDateKey(date),
            ).length > 0}
          >
            <div class="standard-autumn-week-day-name">{getDayName(date)}</div>
            <div class="standard-autumn-week-day-date">
              {getDateDisplay(date)}
            </div>
          </div>
        {/each}
      </div>

      <div
        class="standard-autumn-week-body"
        style="grid-template-columns: 60px repeat({weekDates.length}, 1fr);"
      >
        {#each hours as hour}
          <div class="standard-autumn-week-time-label">
            {String(hour).padStart(2, "0")}:00
          </div>
        {/each}

        {#each weekDates as date, di}
          <div
            class="standard-autumn-week-day-column"
            style={`grid-column: ${di + 2}; grid-row: 1 / ${hours.length + 1};`}
          >
            <div class="standard-autumn-week-day-grid">
              {#each hours as _}
                <div class="standard-autumn-week-hour-row"></div>
              {/each}
            </div>
            <div class="standard-autumn-week-events">
              {#each utilGetOverlappingStepsForDay(steps, formatDateKey(date)) as { step, index, totalCount, relStart, relEnd }}
                {#if isSecretStep(step) && !hasEditPermission}
                  <button
                    type="button"
                    class="standard-autumn-week-event"
                    style={utilGetEventStyleForDay(
                      hours,
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
                    class="standard-autumn-week-event"
                    class:standard-autumn-week-event-transport={isTransportType(
                      step.type,
                    )}
                    style={utilGetEventStyleForDay(
                      hours,
                      relStart,
                      relEnd,
                      index,
                      totalCount,
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
          </div>
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

<style>
  .standard-autumn-week-body {
    display: grid;
    grid-auto-rows: 40px;
    position: relative;
    gap: 0;
  }

  .standard-autumn-week-day-column {
    position: relative;
    overflow: visible;
  }

  .standard-autumn-week-day-grid {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .standard-autumn-week-hour-row {
    height: 40px;
    border-top: 1px solid var(--standard-autumn-line-color, #eee);
    box-sizing: border-box;
  }

  .standard-autumn-week-events {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .standard-autumn-week-event {
    position: absolute;
    box-sizing: border-box;
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--standard-autumn-event-bg, #fff);
    border: 1px solid var(--standard-autumn-border, #e6e0d6);
    display: flex;
    gap: 6px;
    align-items: center;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .standard-autumn-week-event-icon {
    display: inline-flex;
    align-items: center;
  }
</style>
