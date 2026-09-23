<script lang="ts">
  import SharedItineraryView from "../../core/ItineraryView.svelte";
  import "./styles/index.css";

  export let readOnly = false; export let itinerary;
  export let steps;
  export let onUpdateItinerary = undefined;
  export let onCreateStep = undefined;
  export let onUpdateStep = undefined;
  export let onDeleteStep = undefined;
  export let onBatchUpdateDates = undefined;
  export let onReorderSteps = undefined;
</script>

<SharedItineraryView
    {readOnly}
{itinerary}
  {steps}
  {onUpdateItinerary}
  {onCreateStep}
  {onUpdateStep}
  {onDeleteStep}
  {onBatchUpdateDates}
  {onReorderSteps}
/>
