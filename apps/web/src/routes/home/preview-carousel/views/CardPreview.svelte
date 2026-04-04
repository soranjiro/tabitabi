<script lang="ts">
  import type { PreviewItinerary } from "../../previewData/types";
  export let preview: PreviewItinerary;
  export let dateDisplay: string;
</script>

<div class="card-preview">
  <div class="card-title">{preview.title}</div>
  <div class="card-date-header">
    <span class="date-icon">🗓️</span>
    <span class="date-text">{dateDisplay}</span>
  </div>

  <div class="card-steps">
    {#each preview.steps as step}
      <div class="card-step">
        <div class="card-time-badge">{step.time}</div>
        <div class="card-main-content">
          <span class="card-label">{step.label}</span>
          {#if step.location}
            <span class="card-location">📍 {step.location}</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
