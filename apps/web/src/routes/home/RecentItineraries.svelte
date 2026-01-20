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
    padding: 2rem 1rem;
  }

  @media (max-width: 480px) {
    .recent-section {
      padding: 2.5rem 0.5rem;
    }
  }

  .recent-title {
    font-size: 1.1rem;
    font-weight: 700;
    color: #374151;
    margin-bottom: 1rem;
    max-width: 480px;
    margin-left: auto;
    margin-right: auto;
  }

  @media (max-width: 480px) {
    .recent-title {
      font-size: 0.95rem;
    }
  }

  .recent-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 480px;
    margin: 0 auto;
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
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s,
      box-shadow 0.2s;
    text-align: left;
  }

  .recent-link:hover {
    border-color: #6b8cce;
    background: rgba(107, 140, 206, 0.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .recent-name {
    font-weight: 600;
    color: #374151;
    font-size: 0.9rem;
  }

  .recent-date {
    font-size: 0.75rem;
    color: #9ca3af;
    flex-shrink: 0;
    margin-left: 0.5rem;
  }

  .recent-remove {
    width: 40px;
    height: 40px;
    border: none;
    background: #fbd4d4;
    color: #404040;
    cursor: pointer;
    border-radius: 8px;
    transition:
      background 0.2s,
      color 0.2s;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .recent-remove:hover {
    background: #ffa9a9;
    color: #dc2626;
  }
</style>
