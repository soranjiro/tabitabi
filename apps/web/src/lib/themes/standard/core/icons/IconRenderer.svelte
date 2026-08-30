<script lang="ts">
  import type { StepType } from "@tabitabi/types";
  import { STEP_TYPE } from "@tabitabi/types";
  import GeneralIcon from "./GeneralIcon.svelte";
  import FoodIcon from "./FoodIcon.svelte";
  import HotelIcon from "./HotelIcon.svelte";
  import SightseeingIcon from "./SightseeingIcon.svelte";
  import ShoppingIcon from "./ShoppingIcon.svelte";
  import CarIcon from "./CarIcon.svelte";
  import TrainIcon from "./TrainIcon.svelte";
  import PlaneIcon from "./PlaneIcon.svelte";
  import BusIcon from "./BusIcon.svelte";
  import ShipIcon from "./ShipIcon.svelte";

  interface Props {
    type?: StepType;
    size?: "sm" | "md" | "lg";
    class?: string;
  }

  const {
    type = "normal:general",
    size = "md",
    class: className = "",
  } = $props();

  const sizeClasses: Record<string, string> = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const sizeClass = $derived(() => sizeClasses[size]);
</script>

<div class={`${sizeClass()} ${className}`}>
  {#if type === STEP_TYPE.NORMAL_FOOD || type === STEP_TYPE.NORMAL_MEAL}
    <FoodIcon />
  {:else if type === STEP_TYPE.NORMAL_HOTEL}
    <HotelIcon />
  {:else if type === STEP_TYPE.NORMAL_SIGHTSEEING}
    <SightseeingIcon />
  {:else if type === STEP_TYPE.NORMAL_SHOPPING}
    <ShoppingIcon />
  {:else if type === STEP_TYPE.TRANSPORT_TRAIN}
    <TrainIcon />
  {:else if type === STEP_TYPE.TRANSPORT_CAR}
    <CarIcon />
  {:else if type === STEP_TYPE.TRANSPORT_PLANE}
    <PlaneIcon />
  {:else if type === STEP_TYPE.TRANSPORT_BUS}
    <BusIcon />
  {:else if type === STEP_TYPE.TRANSPORT_SHIP}
    <ShipIcon />
  {:else}
    <GeneralIcon />
  {/if}
</div>
