<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import PlanningView from '../planning-draft/ItineraryView.svelte';
  let props: ComponentProps<typeof PlanningView> = $props();
</script>
<PlanningView {...props} mapPlanning={true} />
