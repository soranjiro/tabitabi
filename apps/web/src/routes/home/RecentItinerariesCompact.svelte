<script lang="ts">
  import { goto } from "$app/navigation";

  interface RecentItem {
    id: string;
    title: string;
    visitedAt: number;
  }

  interface Props {
    items: RecentItem[];
    onShowMore: () => void;
  }

  let { items, onShowMore }: Props = $props();

  // Show only first 3 items
  let displayItems = $derived(items.slice(0, 3));
  let hasMore = $derived(items.length > 3);
</script>

{#if displayItems.length > 0}
  <div class="recent-compact">
    <div class="recent-header">
      <span class="recent-label">最近のしおり</span>
      {#if hasMore}
        <button type="button" onclick={onShowMore} class="show-more-btn">
          もっと見る
        </button>
      {/if}
    </div>
    <div class="recent-items">
      {#each displayItems as item}
        <button onclick={() => goto(`/${item.id}`)} class="recent-chip">
          {item.title}
        </button>
      {/each}
    </div>
  </div>
{/if}

<style>
  .recent-compact {
    margin-top: 1.5rem;
    padding: 1rem;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.25);
  }

  .recent-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .recent-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .show-more-btn {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.8);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .show-more-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    color: white;
  }

  .recent-items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .recent-chip {
    font-size: 0.8rem;
    font-weight: 500;
    color: #374151;
    background: white;
    border: none;
    padding: 0.5rem 0.875rem;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    max-width: 150px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recent-chip:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .recent-chip:active {
    transform: scale(0.98);
  }
</style>
