<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    steps: Step[];
  }

  let { steps }: Props = $props();

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  }
</script>

{#if steps.length === 0}
  <div class="minimal-empty">
    <p>予定がまだ登録されていません</p>
  </div>
{:else}
  <div class="minimal-steps">
    {#each steps as step}
      <div class="minimal-step">
        <div class="minimal-step-time">
          {formatDate(step.date)}
          {step.time}
        </div>
        <h2 class="minimal-step-title">{step.title}</h2>
        {#if step.location}
          <div class="minimal-step-location">📍 {step.location}</div>
        {/if}
        {#if step.notes}
          <div class="minimal-step-notes">{step.notes}</div>
        {/if}
      </div>
    {/each}
  </div>
{/if}
