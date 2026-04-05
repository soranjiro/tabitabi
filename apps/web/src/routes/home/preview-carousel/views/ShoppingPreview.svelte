<script lang="ts">
  import type { PreviewItinerary, PreviewStep } from "../../previewData/types";
  import "../styles/shopping.css";
  export let preview: PreviewItinerary;

  const grouped = preview.steps.reduce<Record<string, PreviewStep[]>>(
    (result, step) => {
      const key = step.location ?? "";
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(step);
      return result;
    },
    {},
  );
</script>

<div class="shopping-preview">
  <div class="shopping-title">{preview.title}</div>
  {#each Object.entries(grouped) as [store, items]}
    <div class="shopping-store">
      <div class="shopping-store-name">{store}</div>
      <div class="shopping-items">
        {#each items ?? [] as item, j}
          <div class="shopping-item" class:done={j === 0}>
            <span class="shopping-checkbox">{j === 0 ? "✓" : ""}</span>
            <span class="shopping-label">{item.label}</span>
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>
