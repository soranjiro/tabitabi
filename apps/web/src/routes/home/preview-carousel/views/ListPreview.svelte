<script lang="ts">
  import type { PreviewItinerary } from "../../previewData/types";
  import "../styles/list.css";
  export let preview: PreviewItinerary;
</script>

<div class="list-preview">
  <div class="list-title">{preview.title}</div>
  <div class="list-divider"></div>
  <div class="list-steps">
    {#each preview.steps as step}
      <div class="list-step">
        <span class="list-time">{step.time}</span>
        <span class="list-label">{step.label}</span>
      </div>
    {/each}
  </div>
</div>
