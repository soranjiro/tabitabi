<script lang="ts">
  import type { PreviewItinerary } from "../../previewData/types";
  export let preview: PreviewItinerary;

  const visibleDays = 14;

  const eventSegments = preview.steps.map((step, index) => {
    const start =
      typeof step.dayOffset === "number" ? step.dayOffset : 2 + index * 4;
    const length =
      typeof step.durationDays === "number" ? step.durationDays : 1;
    return { step, start, length };
  });

  const days = Array.from({ length: visibleDays }, (_, idx) => {
    const day = idx + 1;
    const event = eventSegments.find(
      (segment) => day >= segment.start && day < segment.start + segment.length,
    );
    return { day, event };
  });
</script>

<div class="month-preview">
  <div class="month-header">
    <div>
      <div class="month-title">{preview.title}</div>
      <div class="month-subtitle">2週間の予定</div>
    </div>
    <div class="month-label">MONTH</div>
  </div>

  <div class="month-grid">
    {#each ["日", "月", "火", "水", "木", "金", "土"] as weekday}
      <div class="month-weekday">{weekday}</div>
    {/each}

    {#each days as dayInfo}
      <div
        class="month-day {dayInfo.event ? 'has-event' : ''}"
        title={dayInfo.event ? dayInfo.event.step.label : ""}
      >
        <div class="month-day-number">{dayInfo.day}</div>
        {#if dayInfo.event}
          <div class="month-event-pill">
            {#if dayInfo.event.start === dayInfo.day}
              {dayInfo.event.step.label}
            {:else}
              ・
            {/if}
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <div class="month-events-summary">
    {#each eventSegments as segment}
      <div class="month-event-summary">
        <span class="month-event-summary-label">{segment.step.label}</span>
        <span class="month-event-summary-duration">{segment.length}日</span>
      </div>
    {/each}
  </div>
</div>
