<script lang="ts">
  import { getTheme } from "$lib/themes";
  import MinimalItineraryView from "$lib/themes/minimal/ItineraryView.svelte";
  import StandardItineraryView from "$lib/themes/standard/ItineraryView.svelte";

  let { data } = $props();
  let { itinerary, timeline } = $derived(data);

  let theme = $derived(getTheme(itinerary.themeId || "standard"));
  let useMinimalTheme = $derived(theme.id === "minimal");
</script>

<svelte:head>
  <title>{itinerary.title} - Tabitabi</title>
</svelte:head>

{#if useMinimalTheme}
  <MinimalItineraryView {itinerary} {timeline} />
{:else}
  <StandardItineraryView {itinerary} {timeline} />
{/if}
