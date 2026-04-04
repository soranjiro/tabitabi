<script lang="ts">
  import type { PreviewItinerary } from "../../previewData/types";
  export let preview: PreviewItinerary;
</script>

<div class="timeline-preview">
  <div class="timeline-title">{preview.title}</div>
  <div class="timeline-day-card">
    <div class="timeline-ribbon"></div>
    <div class="timeline-date-header">11月25日</div>
    <div class="timeline-steps">
      {#each preview.steps as step, j}
        <div class="timeline-step {j === 0 ? 'active' : ''}">
          <div class="timeline-time-col">
            <span class="timeline-time">{step.time}</span>
            <div class="timeline-dot"></div>
          </div>
          <div class="timeline-content-card">
            <div class="timeline-content-main">
              <span class="timeline-label">{step.label}</span>
              {#if step.location}
                <span class="timeline-location">📍 {step.location}</span>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
