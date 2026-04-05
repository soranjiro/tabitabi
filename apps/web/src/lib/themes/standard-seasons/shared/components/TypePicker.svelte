<script lang="ts">
  import type { StepType } from "@tabitabi/types";
  import { STEP_TYPE } from "@tabitabi/types";
  import {
    STEP_TYPES_BY_CATEGORY,
    STEP_TYPE_CONFIGS,
  } from "../utils/step-type";
  import IconRenderer from "../icons/IconRenderer.svelte";
  import "../styles/TypePicker.css";

  interface Props {
    value?: StepType;
    onSelect?: (type: StepType) => void;
  }

  const { value = STEP_TYPE.NORMAL_GENERAL, onSelect } = $props();

  function handleSelect(type: StepType) {
    onSelect?.(type);
  }
</script>

<div class="standard-type-picker">
  <div class="standard-type-picker-section">
    <h4 class="standard-type-picker-title">通常の予定</h4>
    <div class="standard-type-picker-grid">
      {#each STEP_TYPES_BY_CATEGORY.normal as type}
        <button
          type="button"
          class="standard-type-picker-item"
          class:standard-type-picker-item-active={value === type}
          onclick={() => handleSelect(type)}
        >
          <div class="standard-type-picker-icon">
            <IconRenderer {type} size="lg" />
          </div>
          <div class="standard-type-picker-label">
            {STEP_TYPE_CONFIGS[type as StepType].label}
          </div>
        </button>
      {/each}
    </div>
  </div>

  <div class="standard-type-picker-section">
    <h4 class="standard-type-picker-title">移動</h4>
    <div class="standard-type-picker-grid">
      {#each STEP_TYPES_BY_CATEGORY.transport as type}
        <button
          type="button"
          class="standard-type-picker-item"
          class:standard-type-picker-item-active={value === type}
          onclick={() => handleSelect(type)}
        >
          <div class="standard-type-picker-icon">
            <IconRenderer {type} size="lg" />
          </div>
          <div class="standard-type-picker-label">
            {STEP_TYPE_CONFIGS[type as StepType].label}
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>
