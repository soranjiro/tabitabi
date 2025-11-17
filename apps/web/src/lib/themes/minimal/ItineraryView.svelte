<script lang="ts">
  import type { Itinerary, Step } from "@tabitabi/types";
  import StepList from "./StepList.svelte";
  import "./theme.css";

  interface Props {
    itinerary: Itinerary;
    steps: Step[];
  }

  let { itinerary, steps }: Props = $props();
</script>

<div class="minimal-theme">
  <header class="minimal-header">
    <h1 class="minimal-title">{itinerary.title}</h1>
  </header>

  <StepList {steps} />
</div>
