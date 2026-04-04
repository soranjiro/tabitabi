<script lang="ts">
  import type { PreviewItinerary, PreviewStep } from "../../previewData/types";
  import "../styles/week.css";
  export let preview: PreviewItinerary;

  const startMonth = 11;
  const startDay = 1;
  const visibleDays = Math.max(
    3,
    Math.max(...preview.steps.map((step) => step.dayOffset ?? 0)) + 1,
  );

  const columns = Array.from({ length: visibleDays }, (_, index) => ({
    dayIndex: index,
    label: `${startMonth}/${String(startDay + index).padStart(2, "0")}`,
  }));

  type WeekEvent = PreviewStep & {
    dayIndex: number;
  };

  const events: WeekEvent[] = preview.steps.map((step, index) => ({
    ...step,
    dayIndex:
      typeof step.dayOffset === "number" ? step.dayOffset : index % visibleDays,
  }));

  function getEventsForDay(index: number) {
    return events
      .filter((event) => event.dayIndex === index)
      .sort((a, b) => {
        const aHour = Number(a.time.split(":")[0]) || 0;
        const bHour = Number(b.time.split(":")[0]) || 0;
        return aHour - bHour;
      })
      .slice(0, 2);
  }
</script>

<div class="week-preview">
  <div class="week-header">
    <div>
      <div class="week-title">{preview.title}</div>
      <div class="week-subtitle">秋の紅葉狩り旅</div>
    </div>
    <span class="week-badge">WEEK</span>
  </div>

  <div class="week-board">
    {#each columns as column}
      <div class="week-column">
        <div class="week-column-title">{column.label}</div>
        <div class="week-column-body">
          {#each getEventsForDay(column.dayIndex) as event}
            <div class="week-card">
              <div class="week-card-label">{event.label}</div>
              <div class="week-card-time">{event.time}</div>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
