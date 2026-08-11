<script lang="ts">
  import LegacyItineraryPage from "../../[id]/+page.svelte";
  import PublicItineraryPage from "$lib/explore/PublicItineraryPage.svelte";

  let { data } = $props();
</script>

{#if data.publicPrototype}
  <PublicItineraryPage itinerary={data.publicItinerary} />
{:else}
  <LegacyItineraryPage {data} />
{/if}
