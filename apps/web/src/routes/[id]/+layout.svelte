<script lang="ts">
  import ExternalSiteOverlay from "$lib/external-site-overlay/ExternalSiteOverlay.svelte";
  import BackgroundControls from "$lib/itinerary/BackgroundControls.svelte";
</script>

<slot />
<BackgroundControls />
<ExternalSiteOverlay />
