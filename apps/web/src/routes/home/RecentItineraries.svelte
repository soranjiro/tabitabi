<script lang="ts">
  import { goto } from "$app/navigation";

  interface RecentItem {
    id: string;
    title: string;
    visitedAt: number;
  }

  interface Props {
    items: RecentItem[];
    onRemove: (id: string) => void;
  }

  let { items, onRemove }: Props = $props();

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  }
</script>

{#if items.length > 0}
  <div class="recent-section">
    <h3 class="recent-title">最近のしおり</h3>
    <div class="recent-list">
      {#each items as item}
        <div class="recent-item">
          <button onclick={() => goto(`/${item.id}`)} class="recent-link">
            <span class="recent-name">{item.title}</span>
            <span class="recent-date">{formatDate(item.visitedAt)}</span>
          </button>
          <button
            type="button"
            onclick={() => onRemove(item.id)}
            class="recent-remove"
            aria-label="削除"
          >
            ×
          </button>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .recent-section {
    margin-top: 2rem;
  }

  .recent-title {
    font-size: 1rem;
    font-weight: 700;
    color: #374151;
    margin-bottom: 0.75rem;
  }

  .recent-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .recent-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .recent-link {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .recent-link:hover {
    border-color: #6b8cce;
    background: rgba(107, 140, 206, 0.05);
  }

  .recent-name {
    font-weight: 600;
    color: #374151;
    font-size: 0.9rem;
  }

  .recent-date {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .recent-remove {
    width: 32px;
    height: 32px;
    border: none;
    background: none;
    color: #9ca3af;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s;
    font-size: 1rem;
  }

  .recent-remove:hover {
    background: #fef2f2;
    color: #ef4444;
  }
</style>
