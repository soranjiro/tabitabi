<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate } from "@tabitabi/types";
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
  const hours = DEFAULT_HOURS;

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

      <div class="standard-autumn-week-body">
        {#each hours as hour}
          <div class="standard-autumn-week-time-label">
            {String(hour).padStart(2, "0")}:00
          </div>
          {#each weekDates() as date}
            <div class="standard-autumn-week-cell">
              <div class="standard-autumn-week-cell-background"></div>
              <div class="standard-autumn-week-cell-content">
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
                  {:else if relStart < (hour + 1) * 60 && relEnd > hour * 60}
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
    grid-template-columns: 70px repeat(var(--week-cols, 7), 1fr);
    gap: 0;
    background: var(--standard-autumn-card-bg);
    border: 3px solid var(--standard-autumn-primary);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .standard-autumn-week-header {
    display: contents;
  }

  .standard-autumn-week-corner {
    background: var(--standard-autumn-header-bg);
    border-bottom: 3px solid var(--standard-autumn-primary);
    border-right: 1px solid var(--standard-autumn-border);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 0.5rem;
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--standard-autumn-text-light);
    letter-spacing: 0.1em;
    position: relative;
    overflow: hidden;
  }

  .standard-autumn-week-corner::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--standard-autumn-primary);
  }

  .standard-autumn-week-day-header {
    padding: 1.2rem 0.5rem;
    text-align: center;
    border-bottom: 3px solid var(--standard-autumn-primary);
    border-right: 1px solid var(--standard-autumn-border);
    background: var(--standard-autumn-header-bg);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.35rem;
    position: relative;
    overflow: hidden;
  }

  .standard-autumn-week-day-header::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--standard-autumn-primary);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .standard-autumn-week-day-header.has-events::before {
    opacity: 1;
  }

  .standard-autumn-week-day-header:last-child {
    border-right: none;
  }

  .standard-autumn-week-day-name {
    font-weight: 700;
    color: var(--standard-autumn-primary);
    font-size: 1rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .standard-autumn-week-day-date {
    font-size: 0.85rem;
    color: var(--standard-autumn-text-light);
    font-weight: 600;
  }

  .standard-autumn-week-day-header.has-events .standard-autumn-week-day-date {
    background: var(--standard-autumn-primary);
    color: #fff;
    padding: 4px 10px;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
    font-weight: 700;
  }

  .standard-autumn-week-body {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: 70px repeat(var(--week-cols, 7), 1fr);
    grid-auto-rows: 56px;
    grid-auto-flow: row;
  }

  .standard-autumn-week-time-label {
    padding: 0.5rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--standard-autumn-text-light);
    text-align: right;
    border-right: 1px solid var(--standard-autumn-border);
    background: var(--standard-autumn-header-bg);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    letter-spacing: 0.03em;
  }

  .standard-autumn-week-cell {
    border-right: 1px solid var(--standard-autumn-border);
    border-bottom: 1px solid var(--standard-autumn-border);
    position: relative;
    background: var(--standard-autumn-bg);
    overflow: visible;
  }

  .standard-autumn-week-cell:nth-child(2n) {
    background: rgba(var(--standard-autumn-primary-rgb), 0.02);
  }

  .standard-autumn-week-cell-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
  }

  .standard-autumn-week-cell-content {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .standard-autumn-week-event {
    position: absolute;
    box-sizing: border-box;
    padding: 6px 8px;
    border-radius: 6px;
    background: var(--standard-autumn-primary);
    color: #fff;
    border: 2px solid var(--standard-autumn-primary);
    display: flex;
    gap: 4px;
    align-items: center;
    overflow: hidden;
    font-size: 0.7rem;
    font-weight: 700;
    z-index: 10;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    margin: 2px;
    white-space: nowrap;
  }

  .standard-autumn-week-event::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 6px 6px 0 0;
  }

  .standard-autumn-week-event:hover {
    z-index: 20;
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
  }

  .standard-autumn-week-event:active {
    transform: translateY(0) scale(0.98);
  }

  .standard-autumn-week-event-transport {
    background: var(--standard-autumn-accent);
    border-color: var(--standard-autumn-accent);
    border-left: 4px solid rgba(255, 255, 255, 0.6);
  }

  .standard-autumn-week-event-transport::after {
    content: '⇒';
    position: absolute;
    right: 4px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 0.9rem;
    opacity: 0.8;
    animation: pulse-arrow 2s ease-in-out infinite;
  }

  @keyframes pulse-arrow {
    0%, 100% {
      transform: translateY(-50%) translateX(0);
      opacity: 0.8;
    }
    50% {
      transform: translateY(-50%) translateX(2px);
      opacity: 1;
    }
  }

  .standard-autumn-week-event-icon {
    display: inline-flex;
    align-items: center;
    font-size: 0.95rem;
    flex-shrink: 0;
  }

  .standard-autumn-week-event-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
    font-weight: 700;
    letter-spacing: 0.02em;
  }
</style>
