<script lang="ts">
  import ItineraryPage from "../../[id]/+page.svelte";

  let { data } = $props();
  const Page = ItineraryPage as any;
</script>

<Page {data} readOnly />
