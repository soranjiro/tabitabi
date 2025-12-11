<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    steps: Step[];
    onStepClick?: (step: Step, index: number) => void;
  }
  let { steps, onStepClick }: Props = $props();

  const DATE_COLORS = [
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#3B82F6",
    "#6366F1",
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

  function formatTime(time: string): string {
    return time.slice(0, 5);
  }
</script>

{#if getStepsWithoutLocation().length > 0}
  <div class="no-location-panel">
    <div class="panel-header">
      <div class="header-icon">
        <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
          <path
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
          />
        </svg>
      </div>
      <span>No Location Set</span>
    </div>
    <div class="step-items">
      {#each getStepsWithoutLocation() as step}
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <div class="step-item" onclick={() => handleStepClick(step)}>
          <div
            class="step-badge"
            style="background: linear-gradient(135deg, {getDateColor(
              step.date,
            )}, {getDateColor(step.date)}99)"
          >
            {getStepNumber(step)}
          </div>
          <div class="step-content">
            <div class="step-title">{step.title}</div>
            <div class="step-meta">
              <span class="step-time">{formatTime(step.time)}</span>
            </div>
          </div>
          <div class="step-arrow">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path
                d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
              />
            </svg>
          </div>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .no-location-panel {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 900;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(139, 92, 246, 0.2);
    border-radius: 16px;
    padding: 16px;
    max-width: 300px;
    max-height: calc(100vh - 180px);
    overflow-y: auto;
    box-shadow:
      0 8px 32px rgba(0, 0, 0, 0.4),
      0 0 40px rgba(139, 92, 246, 0.1);
  }

  .no-location-panel::-webkit-scrollbar {
    width: 4px;
  }

  .no-location-panel::-webkit-scrollbar-track {
    background: transparent;
  }

  .no-location-panel::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 2px;
  }

  .panel-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    color: #f59e0b;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .header-icon {
    width: 24px;
    height: 24px;
    background: rgba(245, 158, 11, 0.2);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .step-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .step-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
  }

  .step-item:hover {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateX(4px);
  }

  .step-badge {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    color: white;
    font-weight: 700;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .step-content {
    flex: 1;
    min-width: 0;
  }

  .step-title {
    font-size: 14px;
    font-weight: 600;
    color: #f1f5f9;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .step-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .step-time {
    font-size: 12px;
    color: #94a3b8;
  }

  .step-arrow {
    color: #64748b;
    transition: transform 0.2s ease;
  }

  .step-item:hover .step-arrow {
    color: #8b5cf6;
    transform: translateX(4px);
  }
</style>
