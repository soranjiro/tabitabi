<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    steps: Step[];
    onStepClick?: (step: Step, index: number) => void;
    secretModeEnabled?: boolean;
    secretModeOffset?: number;
    isViewMode?: boolean;
    hasEditPermission?: boolean;
  }
  let {
    steps,
    onStepClick,
    secretModeEnabled = false,
    secretModeOffset = 60,
    isViewMode = false,
    hasEditPermission = false,
  }: Props = $props();

  let showAllSteps = $state(false);

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

  function getAllStepsForEdit(): Step[] {
    return getSortedSteps();
  }

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[date.getDay()];
    return `${month}/${day}(${weekday})`;
  }

  function handleStepClick(step: Step) {
    if (onStepClick) {
      const originalIndex = steps.findIndex((s) => s.id === step.id);
      onStepClick(step, originalIndex);
    }
  }

  function toggleShowAllSteps() {
    showAllSteps = !showAllSteps;
  }

  function getDisplaySteps(): Step[] {
    if (showAllSteps) {
      return getAllStepsForEdit();
    }
    return getStepsWithoutLocation();
  }
</script>

{#if hasEditPermission && !isViewMode}
  <div class="step-list-container">
    <button class="step-list-header" onclick={toggleShowAllSteps}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        width="16"
        height="16"
      >
        <path
          d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
        />
      </svg>
      {#if showAllSteps}
        全ての予定 ({getAllStepsForEdit().length})
      {:else}
        場所未設定 ({getStepsWithoutLocation().length})
      {/if}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        width="16"
        height="16"
        class="toggle-icon {showAllSteps ? 'expanded' : ''}"
      >
        <path d="M7 10l5 5 5-5z" />
      </svg>
    </button>
    <div class="step-list-items">
      {#each getDisplaySteps() as step}
        {#if !isSecretStep(step.date, step.time)}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div
            class="step-list-item {!step.location ? 'no-location' : ''}"
            onclick={() => handleStepClick(step)}
          >
            <div
              class="step-number-badge"
              style="background-color: {getDateColor(step.date)}"
            >
              {getStepNumber(step)}
            </div>
            <div class="step-info">
              <div class="step-title">{step.title}</div>
              <div class="step-time">{formatDate(step.date)} {step.time}</div>
              {#if step.location}
                <div class="step-location">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="12"
                    height="12"
                  >
                    <path
                      d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                    />
                  </svg>
                  {step.location}
                </div>
              {:else}
                <div class="step-no-location-warning">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="12"
                    height="12"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                    />
                  </svg>
                  場所未設定
                </div>
              {/if}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  </div>
{:else if getStepsWithoutLocation().length > 0}
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
  .step-list-container {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 900;
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    max-width: min(320px, calc(100vw - 40px));
    max-height: calc(100vh - 140px);
    overflow: hidden;
    pointer-events: auto;
  }

  @media (max-width: 768px) {
    .step-list-container {
      max-width: calc(100vw - 30px);
      bottom: 15px;
      right: 15px;
      max-height: calc(50vh - 80px);
    }
  }

  @media (max-width: 480px) {
    .step-list-container {
      max-width: calc(100vw - 20px);
      bottom: 10px;
      right: 10px;
      left: 10px;
      max-height: 40vh;
    }
  }

  .step-list-container::-webkit-scrollbar {
    width: 6px;
  }

  .step-list-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .step-list-container::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }

  .step-list-container::-webkit-scrollbar-thumb:hover {
    background: #999;
  }

  .step-list-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #333;
    padding: 10px 12px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    background: #fafafa;
    border-radius: 12px 12px 0 0;
    transition: background 0.2s;
    width: 100%;
    border: none;
    text-align: left;
  }

  .step-list-header:hover {
    background: #f0f0f0;
  }

  .step-list-header:active {
    background: #e8e8e8;
  }

  .toggle-icon {
    margin-left: auto;
    transition: transform 0.2s;
  }

  .toggle-icon.expanded {
    transform: rotate(180deg);
  }

  .step-list-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    overflow-y: auto;
    max-height: calc(100vh - 220px);
  }

  @media (max-width: 768px) {
    .step-list-items {
      max-height: calc(50vh - 140px);
      padding: 10px;
      gap: 6px;
    }
  }

  @media (max-width: 480px) {
    .step-list-items {
      max-height: calc(40vh - 60px);
      padding: 8px;
    }
  }

  .step-list-items::-webkit-scrollbar {
    width: 6px;
  }

  .step-list-items::-webkit-scrollbar-track {
    background: transparent;
  }

  .step-list-items::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }

  .step-list-items::-webkit-scrollbar-thumb:hover {
    background: #999;
  }

  .step-list-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px;
    background: #f9f9f9;
    border-radius: 8px;
    cursor: pointer;
    transition:
      background 0.2s,
      box-shadow 0.2s;
    user-select: none;
    border: 2px solid transparent;
  }

  @media (max-width: 768px) {
    .step-list-item {
      padding: 8px;
      gap: 8px;
    }
  }

  @media (max-width: 480px) {
    .step-list-item {
      padding: 6px 8px;
    }
  }

  .step-list-item:hover {
    background: #f0f0f0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .step-list-item:active {
    background: #e8e8e8;
  }

  .step-list-item.no-location {
    border-color: #ffa726;
    background: #fff3e0;
  }

  .step-list-item.no-location:hover {
    background: #ffe0b2;
  }

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

  @media (max-width: 480px) {
    .step-number-badge {
      width: 24px;
      height: 24px;
      font-size: 12px;
    }
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

  @media (max-width: 480px) {
    .step-title {
      font-size: 13px;
    }
  }

  .step-time {
    font-size: 11px;
    color: #666;
    margin-top: 2px;
  }

  @media (max-width: 480px) {
    .step-time {
      font-size: 10px;
    }
  }

  .step-location {
    font-size: 11px;
    color: #4285f4;
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .step-no-location-warning {
    font-size: 11px;
    color: #f57c00;
    margin-top: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
    font-weight: 600;
  }
</style>
