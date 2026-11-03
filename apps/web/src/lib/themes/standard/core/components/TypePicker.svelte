<script lang="ts">
  import type { StepType } from "@tabitabi/types";
  import { STEP_TYPE } from "@tabitabi/types";
  import {
    STEP_TYPES_BY_CATEGORY,
    STEP_TYPE_CONFIGS,
  } from "../utils/step-type";
  import StepTypeIcon from "../icons/StepTypeIcon.svelte";
  import "../styles/TypePicker.css";

  interface Props {
    value?: StepType;
    onSelect?: (type: StepType) => void;
    layout?: "row" | "grid";
  }

  const { value = STEP_TYPE.NORMAL_GENERAL, onSelect, layout = "row" } = $props();

  function handleSelect(type: StepType) {
    onSelect?.(type);
  }
</script>

<div class={layout === "grid" ? "standard-type-picker standard-type-picker--grid" : "standard-type-picker"}>
  <div class="standard-type-picker-section" role="group" aria-label="予定">
    <h4 class="standard-type-picker-title">予定</h4>
    <div class="standard-type-picker-grid">
      {#each STEP_TYPES_BY_CATEGORY.normal as type}
        <button
          type="button"
          class="standard-type-picker-item"
          class:standard-type-picker-item-active={value === type}
          onclick={() => handleSelect(type)}
          aria-pressed={value === type}
          title={STEP_TYPE_CONFIGS[type as StepType].description}
        >
          <span class="standard-type-picker-icon" aria-hidden="true">
            <StepTypeIcon {type} size="sm" />
          </span>
          <div class="standard-type-picker-label">
            {STEP_TYPE_CONFIGS[type as StepType].label}
          </div>
        </button>
      {/each}
    </div>
  </div>

  <div class="standard-type-picker-section" role="group" aria-label="移動">
    <h4 class="standard-type-picker-title">移動</h4>
    <div class="standard-type-picker-grid">
      {#each STEP_TYPES_BY_CATEGORY.transport as type}
        <button
          type="button"
          class="standard-type-picker-item"
          class:standard-type-picker-item-active={value === type}
          onclick={() => handleSelect(type)}
          aria-pressed={value === type}
          title={STEP_TYPE_CONFIGS[type as StepType].description}
        >
          <span class="standard-type-picker-icon" aria-hidden="true">
            <StepTypeIcon {type} size="sm" />
          </span>
          <div class="standard-type-picker-label">
            {STEP_TYPE_CONFIGS[type as StepType].label}
          </div>
        </button>
      {/each}
    </div>
  </div>
  {#if layout === "grid"}
    <p class="standard-type-picker-help" aria-live="polite">{STEP_TYPE_CONFIGS[value]?.description ?? STEP_TYPE_CONFIGS[STEP_TYPE.NORMAL_GENERAL].description}</p>
  {/if}
</div>
