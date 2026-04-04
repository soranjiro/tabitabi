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
  const hours = $derived(() => getWeekHours(steps.filter((s) => !s.is_all_day)));

  const timedSteps = $derived(() => steps.filter((s) => !s.is_all_day));

  function getEventBackgroundStyle(step: Step): string {
    // テーマに応じた色を設定
    let primaryColor = '#8b2e1f';  // default: autumn
    let accentColor = '#c46b1f';
    
    // URLからテーマを判定
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const theme = urlParams.get('theme') || '';
      
      if (theme.includes('spring')) {
        primaryColor = '#4a7c59';
        accentColor = '#7fb069';
      } else if (theme.includes('summer')) {
        primaryColor = '#006494';
        accentColor = '#52cfe0';
      } else if (theme.includes('winter')) {
        primaryColor = '#2b4c6b';
        accentColor = '#7899c4';
      }
    }
    
    if (step.is_all_day) {
      return `background: ${primaryColor} !important; background-color: ${primaryColor} !important; color: #fff !important; opacity: 0.8;`;
    }
    if (isTransportType(step.type)) {
      return `background: ${accentColor} !important; background-color: ${accentColor} !important; color: #fff !important; border-left: 3px dashed rgba(255, 255, 255, 0.6); padding-left: 4px;`;
    }
    return `background: ${primaryColor} !important; background-color: ${primaryColor} !important; color: #fff !important;`;
  }

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

<div class="standard-autumn-week-view" style="--week-cols: {numCols};">
  {#if weekDates().length === 0}
    <div class="standard-autumn-week-no-events">
      予定がまだ登録されていません
    </div>
  {:else}
    <div class="standard-autumn-week-container">
      <div class="standard-autumn-week-header">
        <div class="standard-autumn-week-corner"></div>
        {#each weekDates() as date}
          <div
            class="standard-autumn-week-day-header"
            class:has-events={utilGetOverlappingStepsForDay(
              timedSteps(),
              formatDateKey(date),
            ).length > 0 || getAllDayStepsForDate(date).length > 0}
          >
            <div class="standard-autumn-week-day-name">{getDayName(date)}</div>
            <div class="standard-autumn-week-day-date">
              {getDateDisplay(date)}
            </div>
          </div>
        {/each}
      </div>

      {#if hasAnyAllDayEvents()}
        <div class="standard-autumn-week-allday-row">
          <div class="standard-autumn-week-allday-label">終日</div>
          {#each weekDates() as date}
            <div class="standard-autumn-week-allday-cell">
              {#each getAllDayStepsForDate(date) as step}
                <button
                  type="button"
                  class="standard-autumn-week-allday-event"
                  style={getEventBackgroundStyle(step)}
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
              {/each}
            </div>
          {/each}
        </div>
      {/if}

      <div class="standard-autumn-week-body">
        {#each hours() as hour}
          <div class="standard-autumn-week-time-label">
            {String(hour).padStart(2, "0")}:00
          </div>
          {#each weekDates() as date}
            <div class="standard-autumn-week-cell"></div>
          {/each}
        {/each}

        <div
          class="standard-autumn-week-events-layer"
          style="--week-hour-rows: {hours().length};"
        >
          {#each weekDates() as date, dayIndex}
            <div
              class="standard-autumn-week-day-events"
              style="grid-column: {dayIndex + 2}; grid-row: 1 / span {hours()
                .length};"
            >
              {#each utilGetOverlappingStepsForDay(timedSteps(), formatDateKey(date)) as { step, index, totalCount, relStart, relEnd }}
                {#if isSecretStep(step) && !hasEditPermission}
                  <button
                    type="button"
                    class="standard-autumn-week-event"
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
                    class="standard-autumn-week-event"
                    class:standard-autumn-week-event-transport={isTransportType(
                      step.type,
                    )}
                    style={`${utilGetEventStyleForDay(
                      hours(),
                      relStart,
                      relEnd,
                      index,
                      totalCount,
                    )} ${getEventBackgroundStyle(step)}`}
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
  .standard-autumn-week-view {
    padding: 1rem;
    padding-bottom: 100px;
    overflow-x: auto;
    background: var(--standard-autumn-bg);
  }

  .standard-autumn-week-no-events {
    padding: 2rem;
    text-align: center;
    color: var(--standard-autumn-text-light);
    font-size: 0.95rem;
  }

  .standard-autumn-week-container {
    display: grid;
    grid-template-columns: 60px repeat(var(--week-cols, 7), minmax(80px, 1fr));
    gap: 0;
    background: var(--standard-autumn-card-bg);
    border: 2px solid var(--standard-autumn-primary);
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    min-width: min-content;
  }

  .standard-autumn-week-header {
    display: contents;
  }

  .standard-autumn-week-corner {
    background: var(--standard-autumn-header-bg);
    border-bottom: 1px solid var(--standard-autumn-border);
    border-right: 1px solid var(--standard-autumn-border);
  }

  .standard-autumn-week-day-header {
    padding: 0.75rem 0.5rem;
    text-align: center;
    border-bottom: 2px solid var(--standard-autumn-primary);
    border-right: 1px solid var(--standard-autumn-border);
    background: var(--standard-autumn-header-bg);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.25rem;
  }

  .standard-autumn-week-day-header:last-child {
    border-right: none;
  }

  .standard-autumn-week-day-name {
    font-weight: 600;
    color: var(--standard-autumn-primary);
    font-size: 0.9rem;
  }

  .standard-autumn-week-day-date {
    font-size: 0.8rem;
    color: var(--standard-autumn-text-light);
    font-weight: 500;
  }

  .standard-autumn-week-day-header.has-events .standard-autumn-week-day-date {
    background: var(--standard-autumn-primary);
    color: #fff;
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 600;
  }

  .standard-autumn-week-body {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: 60px repeat(var(--week-cols, 7), minmax(80px, 1fr));
    grid-auto-rows: 56px;
    grid-auto-flow: row;
    background: var(--standard-autumn-bg);
    position: relative;
  }

  .standard-autumn-week-time-label {
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--standard-autumn-text-light);
    text-align: right;
    border-right: 1px solid var(--standard-autumn-border);
    background: var(--standard-autumn-header-bg);
    display: flex;
    align-items: flex-start;
    justify-content: flex-end;
  }

  .standard-autumn-week-cell {
    border-right: 1px solid var(--standard-autumn-border);
    border-bottom: 1px solid var(--standard-autumn-border);
    position: relative;
    background: var(--standard-autumn-bg);
    overflow: visible;
  }

  .standard-autumn-week-events-layer {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: 60px repeat(var(--week-cols, 7), minmax(80px, 1fr));
    grid-template-rows: repeat(var(--week-hour-rows, 16), 56px);
    pointer-events: none;
    z-index: 8;
  }

  .standard-autumn-week-day-events {
    position: relative;
    overflow: visible;
    pointer-events: none;
  }

  .standard-autumn-week-event {
    position: absolute;
    box-sizing: border-box;
    padding: 4px 6px;
    border-radius: 4px;
    background-color: var(--standard-autumn-primary) !important;
    color: #fff;
    border: none;
    display: flex;
    gap: 4px;
    align-items: center;
    overflow: hidden;
    font-size: 0.7rem;
    font-weight: 600;
    z-index: 10;
    cursor: pointer;
    pointer-events: auto;
    transition: background-color 0.15s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin: 2px;
    white-space: nowrap;
    min-width: 60px;
  }

  .standard-autumn-week-event:hover {
    z-index: 20;
    background-color: var(--standard-autumn-primary-light) !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
  }

  .standard-autumn-week-event-transport {
    background-color: var(--standard-autumn-accent) !important;
    border-left: 3px dashed rgba(255, 255, 255, 0.6);
    padding-left: 4px;
  }

  .standard-autumn-week-event-transport:hover {
    background-color: rgba(230, 180, 34, 0.9) !important;
  }

  .standard-autumn-week-event-allday {
    background: rgba(169, 53, 41, 0.15);
    color: var(--standard-autumn-primary);
    border: 1px solid var(--standard-autumn-primary);
  }

  .standard-autumn-week-event-allday:hover {
    background: rgba(169, 53, 41, 0.25);
  }

  .standard-autumn-week-event-icon {
    display: inline-flex;
    align-items: center;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .standard-autumn-week-event-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
    font-weight: 600;
  }

  .standard-autumn-week-allday-row {
    display: contents;
  }

  .standard-autumn-week-allday-label {
    padding: 0.5rem 0.25rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--standard-autumn-text-light);
    text-align: right;
    border-right: 1px solid var(--standard-autumn-border);
    border-bottom: 2px solid var(--standard-autumn-primary);
    background: var(--standard-autumn-header-bg);
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .standard-autumn-week-allday-cell {
    padding: 4px;
    border-right: 1px solid var(--standard-autumn-border);
    border-bottom: 2px solid var(--standard-autumn-primary);
    background: var(--standard-autumn-bg);
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    min-height: 36px;
    align-items: flex-start;
  }

  .standard-autumn-week-allday-cell:last-child {
    border-right: none;
  }

  .standard-autumn-week-allday-event {
    padding: 4px 8px;
    border-radius: 4px;
    background-color: var(--standard-autumn-primary) !important;
    color: #fff;
    border: none;
    display: flex;
    gap: 4px;
    align-items: center;
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.15s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 100%;
  }

  .standard-autumn-week-allday-event:hover {
    background-color: var(--standard-autumn-primary-light) !important;
  }

  @media (max-width: 600px) {
    .standard-autumn-week-container {
      grid-template-columns: 50px repeat(var(--week-cols, 7), minmax(70px, 1fr));
    }

    .standard-autumn-week-body {
      grid-template-columns: 50px repeat(var(--week-cols, 7), minmax(70px, 1fr));
    }

    .standard-autumn-week-events-layer {
      grid-template-columns: 50px repeat(var(--week-cols, 7), minmax(70px, 1fr));
    }

    .standard-autumn-week-event {
      font-size: 0.65rem;
      padding: 3px 4px;
      min-width: 50px;
    }
  }
</style>
