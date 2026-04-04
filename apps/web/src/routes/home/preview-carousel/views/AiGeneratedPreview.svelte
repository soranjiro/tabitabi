<script lang="ts">
  import type { PreviewItinerary } from "../../previewData/types";
  import "../styles/ai-generated.css";
  export let preview: PreviewItinerary;
</script>

<div class="ai-preview">
  <div class="ai-header">
    <span class="ai-emoji">🏝️</span>
    <span class="ai-title">{preview.title}</span>
  </div>
  <div class="ai-timeline">
    {#each preview.steps.slice(0, 3) as step}
      <div class="ai-step">
        <span class="ai-time">{step.time}</span>
        <span class="ai-label">{step.label}</span>
      </div>
    {/each}
  </div>
</div>
