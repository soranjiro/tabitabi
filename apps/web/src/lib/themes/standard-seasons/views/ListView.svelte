<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    steps: Step[];
    hasEditPermission: boolean;
    onUpdateStep: ((stepId: string, data: { title?: string; date?: string; time?: string; location?: string; notes?: string }) => Promise<void>) | undefined;
    onDeleteStep: ((stepId: string) => Promise<void>) | undefined;
    onEditStep: (step: Step) => void;
    onSelectStep: (step: Step) => void;
  }

  let { steps, onSelectStep }: Props = $props();

  const sortedSteps = $derived(
    [...steps].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare !== 0 ? dateCompare : a.time.localeCompare(b.time);
    })
  );

  function formatDateSeparator(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
    return `${month}月${day}日 ${dayNames[date.getDay()]}`;
  }
</script>

<div class="ss-list-view">
  {#if sortedSteps.length === 0}
    <div class="ss-empty">予定がありません</div>
  {:else}
    {#each sortedSteps as step, i}
      {#if i === 0 || sortedSteps[i - 1].date !== step.date}
        <div class="ss-list-date-sep">{formatDateSeparator(step.date)}</div>
      {/if}
      <div
        class="ss-list-item"
        onclick={() => onSelectStep(step)}
        role="button"
        tabindex="0"
        onkeydown={(e) => e.key === 'Enter' && onSelectStep(step)}
      >
        <span class="ss-list-time">{step.time}</span>
        <div class="ss-list-body">
          <span class="ss-list-title">{step.title}</span>
          {#if step.location}
            <span class="ss-list-location">{step.location}</span>
          {/if}
        </div>
      </div>
    {/each}
  {/if}
</div>
