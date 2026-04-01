<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate, getStepTime } from "@tabitabi/types";
  import { renderMarkdown } from "../utils/markdown";
  import EventDetailDialog from "../components/EventDetailDialog.svelte";

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

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function getDayOfWeek(dateStr: string): string {
    const date = new Date(dateStr);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    return days[date.getDay()];
  }

  const sortedSteps = $derived(
    [...steps].sort((a, b) => a.start_at - b.start_at),
  );

  function handleRowClick(step: Step) {
    selectedStep = step;
  }

  function closeDialog() {
    selectedStep = null;
  }
</script>

<div class="standard-autumn-list-view">
  {#if steps.length === 0}
    <div class="standard-autumn-empty">予定がまだ登録されていません</div>
  {:else}
    <table class="standard-autumn-list-table">
      <tbody>
        {#each sortedSteps as step, idx}
          {#if idx === 0 || getStepDate(sortedSteps[idx - 1]) !== getStepDate(step)}
            <tr class="standard-autumn-list-date-header">
              <td colspan="4" class="standard-autumn-list-date-header-cell">
                <div class="standard-autumn-list-date-header-content">
                  <span class="standard-autumn-list-date-header-date"
                    >{formatDate(getStepDate(step))}</span
                  >
                  <span class="standard-autumn-list-date-header-day"
                    >({getDayOfWeek(getStepDate(step))})</span
                  >
                </div>
              </td>
            </tr>
          {/if}

          {#if isSecretStep(step) && !hasEditPermission}
            <tr>
              <td class="standard-autumn-list-time">{getStepTime(step)}</td>
              <td colspan="3" class="standard-autumn-list-title-cell">
                <span class="standard-autumn-secret-text">🔒 Secret</span>
              </td>
            </tr>
          {:else}
            <tr
              onmouseenter={(e) =>
                e.currentTarget?.style.setProperty("cursor", "pointer")}
              onmouseleave={(e) =>
                e.currentTarget?.style.setProperty("cursor", "default")}
              onclick={() => handleRowClick(step)}
            >
              <td class="standard-autumn-list-time">{getStepTime(step)}</td>
              <td colspan="3" class="standard-autumn-list-title-cell">
                <div class="standard-autumn-list-title-content">
                  <span class="standard-autumn-list-title">{step.title}</span>
                  {#if step.location}
                    <div class="standard-autumn-list-location">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path
                          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                        />
                      </svg>
                      {step.location}
                    </div>
                  {/if}
                  {#if step.notes}
                    <div class="standard-autumn-list-notes">
                      {@html renderMarkdown(step.notes)}
                    </div>
                  {/if}
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}
</div>

{#if selectedStep}
  <EventDetailDialog
    step={selectedStep}
    {hasEditPermission}
    onClose={closeDialog}
    {onUpdateStep}
    {onDeleteStep}
  />
{/if}
