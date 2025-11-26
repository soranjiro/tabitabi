<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    steps: Step[];
    title: string;
  }

  let { steps, title }: Props = $props();

  const tripInfo = $derived(() => {
    if (steps.length === 0) return null;

    const dates = [...new Set(steps.map((s) => s.date))].sort();
    const startDate = new Date(dates[0]);
    const endDate = new Date(dates[dates.length - 1]);
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    const totalDays = dates.length;
    const currentDayIndex = dates.indexOf(today);

    const isBeforeTrip = now < startDate;
    const isAfterTrip = now > new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
    const isDuringTrip = !isBeforeTrip && !isAfterTrip;

    let daysUntilTrip = 0;
    if (isBeforeTrip) {
      daysUntilTrip = Math.ceil(
        (startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
    }

    const completedSteps = steps.filter((s) => {
      const stepDateTime = new Date(`${s.date}T${s.time}`);
      return stepDateTime < now;
    }).length;

    const progress =
      steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

    return {
      totalDays,
      currentDay: currentDayIndex + 1,
      isBeforeTrip,
      isAfterTrip,
      isDuringTrip,
      daysUntilTrip,
      progress,
      completedSteps,
      totalSteps: steps.length,
      startDate: dates[0],
      endDate: dates[dates.length - 1],
    };
  });

  function formatCountdown(days: number): string {
    if (days === 0) return "今日から！";
    if (days === 1) return "明日から！";
    return `あと ${days} 日`;
  }
</script>

{#if tripInfo()}
  {@const info = tripInfo()!}
  <div class="trip-progress">
    {#if info.isBeforeTrip}
      <div class="trip-countdown">
        <div class="countdown-icon">🎉</div>
        <div class="countdown-text">{formatCountdown(info.daysUntilTrip)}</div>
        <div class="countdown-subtext">旅行開始まで</div>
      </div>
    {:else if info.isDuringTrip}
      <div class="trip-active">
        <div class="active-badge">
          <span class="pulse-dot"></span>
          旅行中
        </div>
        <div class="active-day">Day {info.currentDay} / {info.totalDays}</div>
      </div>
    {:else}
      <div class="trip-completed">
        <div class="completed-icon">✨</div>
        <div class="completed-text">旅行完了！</div>
      </div>
    {/if}

    <div class="progress-bar-container">
      <div class="progress-bar" style="width: {info.progress}%"></div>
      <div class="progress-markers">
        {#each Array(info.totalSteps) as _, i}
          <div
            class="progress-marker"
            class:completed={i < info.completedSteps}
            style="left: {(i / Math.max(info.totalSteps - 1, 1)) * 100}%"
          ></div>
        {/each}
      </div>
    </div>
    <div class="progress-label">
      {info.completedSteps} / {info.totalSteps} 予定完了
    </div>
  </div>
{/if}

<style>
  .trip-progress {
    padding: 1rem 1.25rem;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-lg);
    margin-bottom: 1.5rem;
  }

  .trip-countdown {
    text-align: center;
    padding: 0.75rem 0;
  }

  .countdown-icon {
    font-size: 2rem;
    margin-bottom: 0.25rem;
  }

  .countdown-text {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--ai-accent);
  }

  .countdown-subtext {
    font-size: 0.8125rem;
    color: var(--ai-text-muted);
    margin-top: 0.125rem;
  }

  .trip-active {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0;
  }

  .active-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: var(--ai-accent);
    color: white;
    border-radius: var(--ai-radius-full);
    font-weight: 600;
    font-size: 0.8125rem;
  }

  .pulse-dot {
    width: 6px;
    height: 6px;
    background: white;
    border-radius: 50%;
    animation: pulse 1.5s ease infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.4;
    }
  }

  .active-day {
    font-weight: 600;
    font-size: 1rem;
    color: var(--ai-text-primary);
  }

  .trip-completed {
    text-align: center;
    padding: 0.75rem 0;
  }

  .completed-icon {
    font-size: 1.75rem;
    margin-bottom: 0.125rem;
  }

  .completed-text {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--ai-success);
  }

  .progress-bar-container {
    position: relative;
    height: 6px;
    background: var(--ai-border);
    border-radius: 3px;
    margin-top: 1rem;
    overflow: hidden;
  }

  .progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: var(--ai-accent);
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .progress-markers {
    display: none;
  }

  .progress-label {
    text-align: center;
    font-size: 0.75rem;
    color: var(--ai-text-muted);
    margin-top: 0.5rem;
  }
</style>
