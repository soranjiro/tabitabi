<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import Dialog from "./Dialog.svelte";
  import { renderMarkdown } from "../utils/markdown";

  interface Props {
    show: boolean;
    step: Step | null;
    hasEditPermission: boolean;
    onEdit: (step: Step) => void;
    onClose: () => void;
  }

  let { show, step, hasEditPermission, onEdit, onClose }: Props = $props();

  function formatDate(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return `${year}年${month}月${day}日 (${days[date.getDay()]})`;
  }
</script>

<Dialog {show} title={step?.title ?? ''} onClose={onClose}>
  {#snippet children()}
    {#if step}
      <div class="ss-detail-content">
        <div class="ss-detail-row">
          <span class="ss-detail-label">日付</span>
          <span class="ss-detail-value">{formatDate(step.date)}</span>
        </div>
        <div class="ss-detail-row">
          <span class="ss-detail-label">時刻</span>
          <span class="ss-detail-value">{step.time}</span>
        </div>
        {#if step.location}
          <div class="ss-detail-row">
            <span class="ss-detail-label">場所</span>
            <span class="ss-detail-value">{step.location}</span>
          </div>
        {/if}
        {#if step.notes}
          <div class="ss-detail-notes">
            {@html renderMarkdown(step.notes)}
          </div>
        {/if}
      </div>
    {/if}
  {/snippet}
  {#snippet actions()}
    {#if hasEditPermission && step}
      <button onclick={() => step && onEdit(step)} class="ss-btn ss-btn-primary">編集</button>
    {/if}
    <button onclick={onClose} class="ss-btn ss-btn-secondary">閉じる</button>
  {/snippet}
</Dialog>
