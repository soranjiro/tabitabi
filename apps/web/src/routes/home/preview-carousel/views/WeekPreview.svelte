<script lang="ts">
  import type { PreviewItinerary } from "../../previewData/types";
  export let preview: PreviewItinerary;

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  const events = preview.steps.map((step, index) => {
    const dayIndex =
      typeof step.dayOffset === "number" ? step.dayOffset : (index * 2) % 7;
    return { ...step, dayIndex };
  });

  function getEventsForDay(index: number) {
    return events.filter((event) => event.dayIndex === index);
  }
</script>

<div class="week-preview">
  <div class="week-header">
    <div>
      <div class="week-title">{preview.title}</div>
      <div class="week-subtitle">1週間の予定</div>
    </div>
    <span class="week-badge">WEEK</span>
  </div>

  <div class="week-grid">
    {#each weekdays as weekday, index}
      <div class="week-day">
        <div class="week-day-name">{weekday}</div>
        <div class="week-day-number">{index + 1}</div>
        {#each getEventsForDay(index) as event}
          <div class="week-event">
            <span class="week-event-label">{event.label}</span>
          </div>
        {/each}
      </div>
    {/each}
  </div>
</div>
