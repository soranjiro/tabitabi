<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    steps: Step[];
    hasEditPermission?: boolean;
    focusedDate?: string | null;
    onUpdateStep?: (
      stepId: string,
      data: {
        title?: string;
        date?: string;
        time?: string;
        location?: string;
        notes?: string;
      },
    ) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
  }

  let {
    steps,
    hasEditPermission = false,
    focusedDate = $bindable(null),
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();
</script>

<div class="pq-step-list">
  {#if steps.length === 0}
    <div class="pq-empty-state">
      <p>No quests registered yet</p>
    </div>
  {/if}
</div>

<style>
  .pq-step-list {
    display: none;
  }

  .pq-empty-state {
    text-align: center;
    padding: 24px;
    color: var(--pq-text-secondary);
  }
</style>
