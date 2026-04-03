<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate } from "@tabitabi/types";

  interface Props {
    steps: Step[];
    title: string;
  }

  let { steps, title }: Props = $props();

  const tripInfo = $derived(() => {
    if (steps.length === 0) return null;

    const dates = [...new Set(steps.map((s) => getStepDate(s)))].sort();
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
      const stepDateTime = new Date(s.start_at);
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
