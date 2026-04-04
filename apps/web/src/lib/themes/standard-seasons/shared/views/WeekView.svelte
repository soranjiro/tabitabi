<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate } from "@tabitabi/types";
  import EventDetailDialog from "../components/EventDetailDialog.svelte";
  import IconRenderer from "../icons/IconRenderer.svelte";
  import { isTransportType } from "../utils/step-type";
  import {
    getWeekDatesFromSteps,
    getWeekHours,
    getOverlappingStepsForDay as utilGetOverlappingStepsForDay,
    getEventStyleForDay as utilGetEventStyleForDay,
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

<style>
  .standard-week-view {
    padding: 1rem;
    padding-bottom: 100px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: var(--standard-bg);
  }

  .standard-week-no-events {
    padding: 2rem;
    text-align: center;
    color: var(--standard-text-light);
    font-size: 0.95rem;
  }

  .standard-week-container {
    display: grid;
    grid-template-columns: 60px repeat(var(--week-cols, 7), minmax(80px, 1fr));
    gap: 0;
    background: var(--standard-card-bg);
    border: 2px solid var(--standard-primary);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    min-width: max-content;
    width: 100%;
  }

  .standard-week-header {
    display: contents;
  }

  .standard-week-corner {
    background: var(--standard-header-bg);
    border-bottom: 1px solid var(--standard-border);
    border-right: 1px solid var(--standard-border);
  }

  .standard-week-day-header {
    padding: 0.75rem 0.5rem;
    text-align: center;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    border-right: 1px solid rgba(0, 0, 0, 0.08);
    background: var(--standard-header-bg);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.25rem;
  }

  .standard-week-day-header:last-child {
    border-right: none;
  }

  .standard-week-day-name {
    font-weight: 600;
    color: var(--standard-primary);
    font-size: 0.9rem;
  }

  .standard-week-day-date {
    font-size: 0.8rem;
    color: var(--standard-text-light);
    font-weight: 500;
  }

  .standard-week-day-header.has-events .standard-week-day-date {
    background: var(--standard-primary);
    color: #fff;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
  }

  .standard-week-body {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: 60px repeat(var(--week-cols, 7), minmax(80px, 1fr));
    grid-auto-rows: 56px;
    grid-auto-flow: row;
    background: var(--standard-bg);
    position: relative;
  }

  .standard-week-time-label {
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--standard-text-light);
    text-align: right;
    border-right: 1px solid rgba(0, 0, 0, 0.08);
    background: var(--standard-header-bg);
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
  }

  .standard-week-cell {
    border-right: 1px solid rgba(0, 0, 0, 0.08);
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
    position: relative;
    background: var(--standard-bg);
    overflow: visible;
  }

  .standard-week-events-layer {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: 60px repeat(var(--week-cols, 7), minmax(80px, 1fr));
    grid-template-rows: repeat(var(--week-hour-rows, 16), 56px);
    pointer-events: none;
    z-index: 8;
  }

  .standard-week-day-events {
    position: relative;
    overflow: visible;
    pointer-events: none;
  }

  .standard-week-event {
    position: absolute;
    box-sizing: border-box;
    padding: 4px 6px;
    border-radius: 4px;
    background-color: rgba(255, 255, 255, 0.96);
    color: var(--standard-text);
    border: 1px solid rgba(0, 0, 0, 0.08);
    display: flex;
    gap: 4px;
    align-items: center;
    overflow: hidden;
    font-size: 0.7rem;
    font-weight: 600;
    z-index: 10;
    cursor: pointer;
    pointer-events: auto;
    transition:
      background-color 0.15s,
      border-color 0.15s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    margin: 2px;
    white-space: nowrap;
    min-width: 60px;
  }

  .standard-week-event:hover {
    z-index: 20;
    background-color: rgba(255, 255, 255, 1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  }

  .standard-week-event-transport {
    background-color: rgba(246, 250, 255, 0.98) !important;
    color: var(--standard-text) !important;
    border: 1px solid rgba(82, 120, 255, 0.22) !important;
    box-shadow: inset 0 0 0 1px rgba(82, 120, 255, 0.08);
    border-left: 3px solid rgba(82, 120, 255, 0.8);
    padding-left: 4px;
  }

  .standard-week-event-transport:hover {
    background-color: rgba(255, 255, 255, 1) !important;
  }

  .standard-week-event-icon {
    display: inline-flex;
    align-items: center;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .standard-week-event-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
    font-weight: 600;
  }

  .standard-week-allday-row {
    display: contents;
  }

  .standard-week-allday-label {
    padding: 0.6rem 0.25rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--standard-primary);
    text-align: right;
    border-right: 1px solid var(--standard-border);
    border-bottom: 2px solid var(--standard-primary);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.8) 0%,
      rgba(255, 255, 255, 0.5) 100%
    );
    display: flex;
    align-items: center;
    justify-content: flex-end;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .standard-week-allday-cell {
    padding: 6px;
    border-right: 1px solid var(--standard-border);
    border-bottom: 2px solid var(--standard-primary);
    background: linear-gradient(
      120deg,
      var(--standard-bg) 0%,
      rgba(255, 255, 255, 0.6) 100%
    );
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 44px;
    align-items: center;
  }

  .standard-week-allday-cell:last-child {
    border-right: none;
  }

  .standard-week-allday-event {
    padding: 5px 10px;
    border-radius: 6px;
    background-color: rgba(255, 255, 255, 0.88);
    color: var(--standard-primary);
    border: 1px solid rgba(0, 0, 0, 0.08);
    display: flex;
    gap: 4px;
    align-items: center;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }

  .standard-week-allday-event:hover {
    background-color: rgba(255, 255, 255, 0.96);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  @media (max-width: 600px) {
    .standard-week-container {
      grid-template-columns: 50px repeat(var(--week-cols, 7), minmax(70px, 1fr));
      min-width: max-content;
      width: 100%;
    }

    .standard-week-body {
      grid-template-columns: 50px repeat(var(--week-cols, 7), minmax(70px, 1fr));
    }

    .standard-week-events-layer {
      grid-template-columns: 50px repeat(var(--week-cols, 7), minmax(70px, 1fr));
    }

    .standard-week-event {
      font-size: 0.65rem;
      padding: 3px 4px;
      min-width: unset;
      max-width: calc(100% - 8px);
      white-space: normal;
      word-break: break-word;
      flex-wrap: wrap;
    }

    .standard-week-event-icon {
      display: none;
    }

    .standard-week-event-title {
      white-space: normal;
      min-width: 0;
    }

    .standard-week-allday-event {
      white-space: normal;
      min-width: 0;
    }
  }
</style>
