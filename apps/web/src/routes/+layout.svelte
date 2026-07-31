<script lang="ts">
  import "../app.css";
  import ExternalSiteOverlay from "$lib/external-site-overlay/ExternalSiteOverlay.svelte";
  import FeedbackWidget from "$lib/feedback/FeedbackWidget.svelte";
</script>

<main class="min-h-screen">
  <slot />
</main>

<ExternalSiteOverlay />
<FeedbackWidget />
