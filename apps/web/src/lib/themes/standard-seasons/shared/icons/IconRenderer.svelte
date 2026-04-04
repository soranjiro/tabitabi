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

  const iconMap: Record<StepType, any> = {
    [STEP_TYPE.NORMAL_GENERAL]: GeneralIcon,
    [STEP_TYPE.NORMAL_FOOD]: FoodIcon,
    [STEP_TYPE.NORMAL_HOTEL]: HotelIcon,
    [STEP_TYPE.NORMAL_SIGHTSEEING]: SightseeingIcon,
    [STEP_TYPE.NORMAL_MEAL]: FoodIcon,
    [STEP_TYPE.NORMAL_SHOPPING]: ShoppingIcon,
    [STEP_TYPE.TRANSPORT_GENERAL]: CarIcon,
    [STEP_TYPE.TRANSPORT_TRAIN]: TrainIcon,
    [STEP_TYPE.TRANSPORT_CAR]: CarIcon,
    [STEP_TYPE.TRANSPORT_PLANE]: PlaneIcon,
    [STEP_TYPE.TRANSPORT_BUS]: BusIcon,
  };

  const sizeClasses: Record<string, string> = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const IconComponent = iconMap[type as StepType] || GeneralIcon;
  const sizeClass = sizeClasses[size];
</script>

<div class={`${sizeClass} ${className}`}>
  <IconComponent />
</div>
