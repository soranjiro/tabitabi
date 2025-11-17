<script lang="ts">
  let { data } = $props();

  const ItineraryView = data.theme.components.ItineraryView;
</script>

<svelte:head>
  <title>{data.itinerary.title} - Tabitabi</title>
</svelte:head>

<ItineraryView itinerary={data.itinerary} steps={data.steps} />
