<script lang="ts">
  import type { StepType } from "@tabitabi/types";
  import {
    STEP_TYPES_BY_CATEGORY,
    STEP_TYPE_CONFIGS,
  } from "../utils/step-type";
  import IconRenderer from "../icons/IconRenderer.svelte";

  interface Props {
    value?: StepType;
    onSelect?: (type: StepType) => void;
  }

  const { value = "normal:general", onSelect } = $props();

  function handleSelect(type: StepType) {
    onSelect?.(type);
  }
</script>

<div class="standard-autumn-type-picker">
  <div class="standard-autumn-type-picker-section">
    <h4 class="standard-autumn-type-picker-title">通常の予定</h4>
    <div class="standard-autumn-type-picker-grid">
      {#each STEP_TYPES_BY_CATEGORY.normal as type}
        <button
          type="button"
          class="standard-autumn-type-picker-item"
          class:standard-autumn-type-picker-item-active={value === type}
          onclick={() => handleSelect(type)}
        >
          <div class="standard-autumn-type-picker-icon">
            <IconRenderer {type} size="lg" />
          </div>
          <div class="standard-autumn-type-picker-label">
            {STEP_TYPE_CONFIGS[type as StepType].label}
          </div>
          <div class="standard-autumn-type-picker-description">
            {STEP_TYPE_CONFIGS[type as StepType].description}
          </div>
        </button>
      {/each}
    </div>
  </div>

  <div class="standard-autumn-type-picker-section">
    <h4 class="standard-autumn-type-picker-title">移動</h4>
    <div class="standard-autumn-type-picker-grid">
      {#each STEP_TYPES_BY_CATEGORY.transport as type}
        <button
          type="button"
          class="standard-autumn-type-picker-item"
          class:standard-autumn-type-picker-item-active={value === type}
          onclick={() => handleSelect(type)}
        >
          <div class="standard-autumn-type-picker-icon">
            <IconRenderer {type} size="lg" />
          </div>
          <div class="standard-autumn-type-picker-label">
            {STEP_TYPE_CONFIGS[type as StepType].label}
          </div>
          <div class="standard-autumn-type-picker-description">
            {STEP_TYPE_CONFIGS[type as StepType].description}
          </div>
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .standard-autumn-type-picker {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .standard-autumn-type-picker-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .standard-autumn-type-picker-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .standard-autumn-type-picker-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
  }

  .standard-autumn-type-picker-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    border: 2px solid var(--border-color);
    border-radius: 0.5rem;
    background: inherit;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .standard-autumn-type-picker-item:hover {
    border-color: var(--primary-color);
    background: var(--hover-bg);
  }

  .standard-autumn-type-picker-item-active {
    border-color: var(--primary-color);
    background: var(--primary-color-10);
  }

  .standard-autumn-type-picker-icon {
    width: 2rem;
    height: 2rem;
    color: var(--primary-color);
  }

  .standard-autumn-type-picker-label {
    font-size: 0.875rem;
    font-weight: 600;
    text-align: center;
  }

  .standard-autumn-type-picker-description {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-align: center;
  }
</style>
