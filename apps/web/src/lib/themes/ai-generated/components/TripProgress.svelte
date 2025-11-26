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
    padding: 1.25rem;
    background: linear-gradient(
      135deg,
      rgba(99, 102, 241, 0.08) 0%,
      rgba(236, 72, 153, 0.08) 100%
    );
    border-radius: var(--ai-radius-lg);
    margin-bottom: 1rem;
  }

  .trip-countdown {
    text-align: center;
    padding: 1rem 0;
  }

  .countdown-icon {
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
    animation: bounce 1s ease infinite;
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-8px);
    }
  }

  .countdown-text {
    font-size: 1.75rem;
    font-weight: 800;
    background: linear-gradient(
      135deg,
      var(--ai-primary) 0%,
      var(--ai-secondary) 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .countdown-subtext {
    font-size: 0.875rem;
    color: var(--ai-text-muted);
    margin-top: 0.25rem;
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
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(
      135deg,
      var(--ai-accent) 0%,
      var(--ai-accent-light) 100%
    );
    color: white;
    border-radius: 2rem;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    background: white;
    border-radius: 50%;
    animation: pulse 1.5s ease infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(1.2);
    }
  }

  .active-day {
    font-weight: 700;
    font-size: 1.125rem;
    color: var(--ai-text-primary);
  }

  .trip-completed {
    text-align: center;
    padding: 1rem 0;
  }

  .completed-icon {
    font-size: 2rem;
    margin-bottom: 0.25rem;
  }

  .completed-text {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--ai-accent);
  }

  .progress-bar-container {
    position: relative;
    height: 8px;
    background: var(--ai-border);
    border-radius: 4px;
    margin-top: 1rem;
    overflow: visible;
  }

  .progress-bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(
      90deg,
      var(--ai-primary) 0%,
      var(--ai-secondary) 100%
    );
    border-radius: 4px;
    transition: width 0.5s ease;
  }

  .progress-markers {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    transform: translateY(-50%);
  }

  .progress-marker {
    position: absolute;
    width: 12px;
    height: 12px;
    background: var(--ai-border);
    border: 2px solid var(--ai-surface);
    border-radius: 50%;
    transform: translateX(-50%);
    transition: all 0.3s ease;
  }

  .progress-marker.completed {
    background: var(--ai-primary);
    box-shadow: 0 0 8px rgba(99, 102, 241, 0.4);
  }

  .progress-label {
    text-align: center;
    font-size: 0.75rem;
    color: var(--ai-text-muted);
    margin-top: 0.75rem;
  }
</style>
