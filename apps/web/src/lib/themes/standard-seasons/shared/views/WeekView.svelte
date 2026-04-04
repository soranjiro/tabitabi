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
  const hours = $derived(() => getWeekHours(steps));

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
              {#each utilGetOverlappingStepsForDay(steps, formatDateKey(date)) as { step, index, totalCount, relStart, relEnd }}
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
    border-bottom: 1px solid var(--standard-autumn-primary);
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
    content: "";
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
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--standard-autumn-primary);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .standard-autumn-week-day-header::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 10px,
      rgba(var(--standard-autumn-primary-rgb), 0.03) 10px,
      rgba(var(--standard-autumn-primary-rgb), 0.03) 11px
    );
    pointer-events: none;
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
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.5);
  }

  .standard-autumn-week-day-date {
    font-size: 0.85rem;
    color: var(--standard-autumn-text-light);
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .standard-autumn-week-day-header.has-events .standard-autumn-week-day-date {
    background: var(--standard-autumn-primary);
    color: #fff;
    padding: 4px 10px;
    border-radius: 6px;
    width: auto;
    height: auto;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .standard-autumn-week-body {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: 70px repeat(var(--week-cols, 7), 1fr);
    grid-auto-rows: 56px;
    grid-auto-flow: row;
    background: var(--standard-autumn-bg);
    position: relative;
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
    position: relative;
    overflow: hidden;
  }

  .standard-autumn-week-time-label::before {
    content: "";
    position: absolute;
    right: 0;
    top: 50%;
    width: 20%;
    height: 1px;
    background: var(--standard-autumn-border);
    transform: translateY(-50%);
  }

  .standard-autumn-week-time-label::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
    background: rgba(var(--standard-autumn-primary-rgb), 0.05);
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

  .standard-autumn-week-cell::before {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: repeating-linear-gradient(
      90deg,
      transparent,
      transparent 20px,
      rgba(var(--standard-autumn-primary-rgb), 0.01) 20px,
      rgba(var(--standard-autumn-primary-rgb), 0.01) 21px
    );
    pointer-events: none;
  }

  .standard-autumn-week-events-layer {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: 70px repeat(var(--week-cols, 7), 1fr);
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
    padding: 6px 8px;
    border-radius: 8px;
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
    pointer-events: auto;
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.12),
      inset 0 1px 2px rgba(255, 255, 255, 0.15);
    margin: 2px;
    white-space: nowrap;
    position: relative;
  }

  .standard-autumn-week-event::before {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    right: 2px;
    height: 2px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 1px;
  }

  .standard-autumn-week-event::after {
    content: "";
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 1px;
    background: rgba(255, 255, 255, 0.4);
    border-radius: 0.5px;
  }

  .standard-autumn-week-event:hover {
    z-index: 20;
    transform: translateY(-4px) scale(1.06);
    box-shadow:
      0 8px 16px rgba(0, 0, 0, 0.18),
      inset 0 1px 2px rgba(255, 255, 255, 0.25);
  }

  .standard-autumn-week-event:active {
    transform: translateY(-1px) scale(0.98);
    box-shadow:
      0 2px 4px rgba(0, 0, 0, 0.12),
      inset 0 1px 2px rgba(255, 255, 255, 0.15);
  }

  .standard-autumn-week-event-transport {
    background: repeating-linear-gradient(
        -45deg,
        rgba(255, 255, 255, 0.1),
        rgba(255, 255, 255, 0.1) 6px,
        rgba(255, 255, 255, 0.02) 6px,
        rgba(255, 255, 255, 0.02) 12px
      ),
      var(--standard-autumn-accent);
    border-color: var(--standard-autumn-accent);
    border-left: 4px dashed rgba(255, 255, 255, 0.7);
    padding-left: 6px;
    box-shadow:
      0 2px 6px rgba(0, 0, 0, 0.15),
      inset 0 0 8px rgba(255, 255, 255, 0.1);
  }

  .standard-autumn-week-event-transport::before {
    background: rgba(255, 255, 255, 0.7);
    animation: shimmer-top 3s ease-in-out infinite;
  }

  .standard-autumn-week-event-transport::after {
    content: "→";
    position: absolute !important;
    right: 4px;
    top: 50%;
    bottom: auto;
    width: auto;
    height: auto;
    transform: translateY(-50%);
    font-size: 0.9rem;
    opacity: 0.9;
    animation: pulse-arrow 2s ease-in-out infinite;
  }

  @keyframes shimmer-top {
    0%,
    100% {
      opacity: 0.6;
    }
    50% {
      opacity: 0.9;
    }
  }

  @keyframes pulse-arrow {
    0%,
    100% {
      transform: translateY(-50%) translateX(0);
      opacity: 0.9;
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
