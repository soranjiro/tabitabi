<script lang="ts">
  import SharedItineraryView from "../shared/ItineraryView.svelte";
  import "./styles/index.css";

  export let itinerary;
  export let steps;
  export let readOnly = false;
  export let onUpdateItinerary = undefined;
  export let onCreateStep = undefined;
  export let onUpdateStep = undefined;
  export let onDeleteStep = undefined;
  export let onReorderSteps = undefined;
</script>

<SharedItineraryView
  {itinerary}
  {steps}
  {readOnly}
  {onUpdateItinerary}
  {onCreateStep}
  {onUpdateStep}
  {onDeleteStep}
  {onReorderSteps}
/>
