<script lang="ts">
  import type { StepType } from "@tabitabi/types";
  import GeneralIcon from "./GeneralIcon.svelte";
  import FoodIcon from "./FoodIcon.svelte";
  import HotelIcon from "./HotelIcon.svelte";
  import SightseeingIcon from "./SightseeingIcon.svelte";
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
    "normal:general": GeneralIcon,
    "normal:food": FoodIcon,
    "normal:hotel": HotelIcon,
    "normal:sightseeing": SightseeingIcon,
    "transport:general": CarIcon,
    "transport:train": TrainIcon,
    "transport:car": CarIcon,
    "transport:plane": PlaneIcon,
    "transport:bus": BusIcon,
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
