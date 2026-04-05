<script lang="ts">
  import type { PreviewItinerary, PreviewStep } from "../../previewData/types";
  import "../styles/month.css";
  export let preview: PreviewItinerary;

  type MonthSegment = {
    step: PreviewStep;
    start: number;
    length: number;
    row: number;
  };

  function splitSegment(start: number, length: number, step: PreviewStep) {
    const segments: MonthSegment[] = [];
    let currentStart = start;
    let remaining = length;

    while (remaining > 0) {
      const row = Math.floor((currentStart - 1) / 7);
      const rowEnd = row * 7 + 7;
      const segmentLength = Math.min(remaining, rowEnd - currentStart + 1);
      segments.push({
        step,
        start: currentStart - row * 7,
        length: segmentLength,
        row,
      });
      currentStart += segmentLength;
      remaining -= segmentLength;
    }

    return segments;
  }

  function assignTracks(segments: MonthSegment[]) {
    const tracks: MonthSegment[][] = [];

    for (const segment of segments) {
      let track = tracks.find((row) =>
        row.every(
          (existing) =>
            existing.start + existing.length <= segment.start ||
            segment.start + segment.length <= existing.start,
        ),
      );

      if (!track) {
        track = [];
        tracks.push(track);
      }

      track.push(segment);
    }

    return tracks;
  }

  const eventSegments = preview.steps.flatMap((step, index) => {
    const start =
      typeof step.dayOffset === "number" ? step.dayOffset + 1 : 1 + index * 4;
    const length = Math.max(
      1,
      typeof step.durationDays === "number" ? step.durationDays : 1,
    );

    return splitSegment(start, length, step);
  });

  const weeks = Array.from({ length: 2 }, (_, weekIndex) => ({
    weekIndex,
    days: Array.from({ length: 7 }, (_, idx) => {
      const day = weekIndex * 7 + idx + 1;
      return {
        day,
        active: eventSegments.some(
          (segment) =>
            segment.row === weekIndex &&
            idx + 1 >= segment.start &&
            idx + 1 < segment.start + segment.length,
        ),
      };
    }),
    tracks: assignTracks(
      eventSegments
        .filter((segment) => segment.row === weekIndex)
        .sort((a, b) => a.start - b.start),
    ),
  }));
</script>

<div class="month-preview">
  <div class="month-header">
    <div>
      <div class="month-title">{preview.title}</div>
    </div>
    <div class="month-label">MONTH</div>
  </div>

  <div class="month-grid">
    {#each weeks as week}
      <div class="month-week">
        {#each week.days as dayData}
          <div class="month-day {dayData.active ? 'has-event' : ''}">
            <div class="month-day-number">{dayData.day}</div>
          </div>
        {/each}

        <div class="month-week-events">
          {#each week.tracks as track}
            <div class="month-event-row">
              {#each track as segment}
                <div
                  class="month-event-bar"
                  style="grid-column: {segment.start} / span {segment.length};"
                  title={segment.step.label}
                >
                  {#if segment.step.icon}
                    <span class="month-event-bar-icon">{segment.step.icon}</span
                    >
                  {/if}
                  <span class="month-event-bar-label">{segment.step.label}</span
                  >
                </div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>
