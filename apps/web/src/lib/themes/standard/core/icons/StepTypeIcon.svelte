<script lang="ts">
  import type { StepType } from "@tabitabi/types";
  import { getStepTypeSvg } from "../utils/step-type-svg";

  let { type, size = "md" }: { type?: StepType; size?: "sm" | "md" | "lg" } = $props();
</script>

<span class={`step-type-icon ${size}`} aria-hidden="true">
  {@html getStepTypeSvg(type)}
</span>

<style>
  .step-type-icon { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; line-height: 1; }
  .step-type-icon.sm { width: 1.25rem; height: 1.25rem; }
  .step-type-icon.md { width: 1.5rem; height: 1.5rem; }
  .step-type-icon.lg { width: 2rem; height: 2rem; }
  .step-type-icon :global(svg) { display: block; width: 100%; height: 100%; }
</style>
