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

  // Show only first 2 items to fit in one row on small screens
  let displayItems = $derived(items.slice(0, 2));
</script>

{#if displayItems.length > 0}
  <div class="recent-compact">
    <span class="recent-label">最近のしおり</span>
    <div class="recent-row">
      {#each displayItems as item}
        <button onclick={() => goto(`/${item.id}`)} class="recent-chip">
          {item.title}
        </button>
      {/each}
      <button type="button" onclick={onShowMore} class="show-more-btn">
        他を見る↓
      </button>
    </div>
  </div>
{/if}

<style>
  .recent-compact {
    margin-top: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .recent-label {
    font-size: 0.7rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.8);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .recent-row {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.5rem;
    align-items: center;
  }

  .recent-chip {
    font-size: 0.75rem;
    font-weight: 500;
    color: white;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.4);
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.2s;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recent-chip:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.6);
  }

  .show-more-btn {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.9);
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.3);
    cursor: pointer;
    padding: 0.4rem 0.6rem;
    border-radius: 999px;
    transition: all 0.2s;
    white-space: nowrap;
  }

  .show-more-btn:hover {
    background: rgba(255, 255, 255, 0.25);
    color: white;
  }

  /* iPhone SE */
  @media (max-width: 375px) {
    .recent-chip {
      max-width: 80px;
      font-size: 0.7rem;
      padding: 0.35rem 0.6rem;
    }

    .show-more-btn {
      font-size: 0.65rem;
      padding: 0.35rem 0.5rem;
    }
  }
</style>
