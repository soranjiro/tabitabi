<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate } from "@tabitabi/types";
  import IconRenderer from "../icons/IconRenderer.svelte";
  import "../styles/AccordionView.css";
  import { getStepTimeLabel } from "$lib/planning/schedule";

  interface Props {
    steps: Step[];
    onStepClick?: (stepId: string) => void;
  }

  let { steps, onStepClick }: Props = $props();
  let openDates = $state<Set<string>>(new Set());
  let hasInitializedOpenDates = false;

  const groups = $derived.by(() => {
    const map = new Map<string, Step[]>();
    for (const step of [...steps].sort((a, b) => a.start_at - b.start_at)) {
      const date = getStepDate(step);
      map.set(date, [...(map.get(date) ?? []), step]);
    }
    return [...map.entries()];
  });

  $effect(() => {
    if (!hasInitializedOpenDates && groups.length) {
      openDates = new Set([groups[0][0]]);
      hasInitializedOpenDates = true;
    }
  });

  function dateLabel(value: string, index: number) {
    const date = new Date(`${value}T00:00:00`);
    return { day: `Day ${index + 1}`, title: `${date.getMonth() + 1}/${date.getDate()}`, weekday: date.toLocaleDateString("ja-JP", { weekday: "short" }) };
  }
</script>

<div class="standard-accordion-view">
  {#if groups.length === 0}
    <div class="standard-empty">予定がまだ登録されていません</div>
  {:else}
    {#each groups as [date, dateSteps], index}
      {@const label = dateLabel(date, index)}
      <section class:open={openDates.has(date)}>
        <button
          class="standard-accordion-heading"
          type="button"
          onclick={() => {
            const nextOpenDates = new Set(openDates);
            if (nextOpenDates.has(date)) nextOpenDates.delete(date);
            else nextOpenDates.add(date);
            openDates = nextOpenDates;
          }}
          aria-expanded={openDates.has(date)}
        >
          <strong>{label.day}</strong><span>{label.title}（{label.weekday}）</span><i aria-hidden="true">⌄</i>
        </button>
        {#if openDates.has(date)}
          <div class="standard-accordion-events">
            {#each dateSteps as step}
              <button type="button" class="standard-accordion-event" onclick={() => onStepClick?.(step.id)}>
                <span class="standard-accordion-dot"></span>
                <time>{step.is_all_day ? "終日" : getStepTimeLabel(step)}</time>
                <span class="standard-accordion-icon"><IconRenderer type={step.type} size="sm" /></span>
                <span class="standard-accordion-copy"><strong>{step.title}</strong>{#if step.location}<small>{step.location}</small>{/if}</span>
              </button>
            {/each}
          </div>
        {/if}
      </section>
    {/each}
  {/if}
</div>
