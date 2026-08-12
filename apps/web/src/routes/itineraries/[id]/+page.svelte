<script lang="ts">
  import LegacyItineraryPage from "../../[id]/+page.svelte";

  let { data } = $props();
  const LegacyPage = LegacyItineraryPage as any;
</script>

<LegacyPage {data} />
