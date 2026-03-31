<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { renderMarkdown } from "../utils/markdown";

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
  }: Props = $props();

  function isSecretStep(stepDate: string, stepTime: string): boolean {
    if (!secretModeEnabled) return false;
    const now = new Date();
    const stepDateTime = new Date(`${stepDate}T${stepTime}`);
    const revealTime = new Date(
      stepDateTime.getTime() - secretModeOffset * 60 * 1000,
    );
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
    [...steps].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    }),
  );
</script>

<div class="standard-autumn-list-view">
  {#if steps.length === 0}
    <div class="standard-autumn-empty">予定がまだ登録されていません</div>
  {:else}
    <table class="standard-autumn-list-table">
      <thead>
        <tr>
          <th>日付</th>
          <th>曜日</th>
          <th>時間</th>
          <th>予定</th>
        </tr>
      </thead>
      <tbody>
        {#each sortedSteps as step}
          {#if isSecretStep(step.date, step.time) && !hasEditPermission}
            <tr>
              <td class="standard-autumn-list-date">{formatDate(step.date)}</td>
              <td class="standard-autumn-list-day">{getDayOfWeek(step.date)}</td
              >
              <td class="standard-autumn-list-time">{step.time}</td>
              <td class="standard-autumn-list-title-cell">
                <span class="standard-autumn-secret-text">🔒 Secret</span>
              </td>
            </tr>
          {:else}
            <tr>
              <td class="standard-autumn-list-date">{formatDate(step.date)}</td>
              <td class="standard-autumn-list-day">{getDayOfWeek(step.date)}</td
              >
              <td class="standard-autumn-list-time">{step.time}</td>
              <td class="standard-autumn-list-title-cell">
                {step.title}
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
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}
</div>
