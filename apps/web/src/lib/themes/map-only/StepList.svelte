<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    steps: Step[];
    onStepClick?: (step: Step, index: number) => void;
    secretModeEnabled?: boolean;
    secretModeOffset?: number;
  }
  let {
    steps,
    onStepClick,
    secretModeEnabled = false,
    secretModeOffset = 60,
  }: Props = $props();

  const DATE_COLORS = [
    "#4285F4",
    "#EA4335",
    "#34A853",
    "#FBBC05",
    "#9C27B0",
    "#00BCD4",
    "#FF5722",
    "#607D8B",
  ];

  function getSortedSteps(): Step[] {
    return [...steps].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  }

  function getUniqueDates(): string[] {
    const sorted = getSortedSteps();
    return [...new Set(sorted.map((s) => s.date))];
  }

  function getDateColor(date: string): string {
    const uniqueDates = getUniqueDates();
    const index = uniqueDates.indexOf(date);
    return DATE_COLORS[index % DATE_COLORS.length];
  }

  function getStepNumber(step: Step): number {
    const sorted = getSortedSteps();
    return sorted.findIndex((s) => s.id === step.id) + 1;
  }

  function isSecretStep(stepDate: string, stepTime: string): boolean {
    if (!secretModeEnabled) return false;
    const now = new Date();
    const stepDateTime = new Date(`${stepDate}T${stepTime}:00`);
    return (
      now.getTime() < stepDateTime.getTime() - secretModeOffset * 60 * 1000
    );
  }

  function getStepsWithoutLocation(): Step[] {
    const sorted = getSortedSteps();
    return sorted.filter((s) => !s.location);
  }

  function handleStepClick(step: Step) {
    if (onStepClick) {
      const originalIndex = steps.findIndex((s) => s.id === step.id);
      onStepClick(step, originalIndex);
    }
  }
</script>

{#if getStepsWithoutLocation().length > 0}
  <div class="no-location-container">
    <div class="no-location-header">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        width="16"
        height="16"
      >
        <path
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
        />
      </svg>
      場所未設定の予定
    </div>
    <div class="no-location-list">
      {#each getStepsWithoutLocation() as step}
        {#if !isSecretStep(step.date, step.time)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div class="no-location-item" onclick={() => handleStepClick(step)}>
            <div
              class="step-number-badge"
              style="background-color: {getDateColor(step.date)}"
            >
              {getStepNumber(step)}
            </div>
            <div class="step-info">
              <div class="step-title">{step.title}</div>
              <div class="step-time">{step.date} {step.time}</div>
            </div>
          </div>
        {/if}
      {/each}
    </div>
  </div>
{/if}

<style>
  .no-location-container {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 900;
    background: white;
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    max-width: 280px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;
    pointer-events: auto;
  }

  .no-location-container::-webkit-scrollbar {
    width: 6px;
  }

  .no-location-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .no-location-container::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }

  .no-location-container::-webkit-scrollbar-thumb:hover {
    background: #999;
  }

  .no-location-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #666;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #eee;
  }

  .no-location-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .no-location-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    background: #f9f9f9;
    border-radius: 8px;
    cursor: pointer;
    transition:
      background 0.2s,
      box-shadow 0.2s;
    user-select: none;
  }

  .no-location-item:hover {
    background: #f0f0f0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .no-location-item:active {
    background: #e8e8e8;
  }

  .step-number-badge {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    color: white;
    font-weight: bold;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .step-info {
    flex: 1;
    min-width: 0;
  }

  .step-title {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .step-time {
    font-size: 11px;
    color: #666;
    margin-top: 2px;
  }
</style>
