<script lang="ts">
  import { browser } from "$app/environment";
  import { printStudioOpen } from "./controller";

  let PrintStudioComponent = $state<any>(null);

  $effect(() => {
    if (!browser || !$printStudioOpen || PrintStudioComponent) return;

    void import("./PrintStudio.svelte").then((module) => {
      PrintStudioComponent = module.default;
    });
  });

  let { itinerary, steps }: { itinerary: any; steps: any[] } = $props();
</script>

{#if PrintStudioComponent}
  <PrintStudioComponent {itinerary} {steps} />
{/if}
