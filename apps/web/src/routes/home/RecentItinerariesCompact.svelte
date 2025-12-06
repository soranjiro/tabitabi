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
        ↓
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
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(10px);
    padding: 1rem 1.25rem;
    border-radius: 12px;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  .recent-label {
    font-size: 0.7rem;
    font-weight: 700;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
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
    font-weight: 600;
    color: white;
    background: rgba(255, 255, 255, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.5);
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    cursor: pointer;
    transition: all 0.2s;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }

  .recent-chip:hover {
    background: rgba(255, 255, 255, 0.35);
    border-color: rgba(255, 255, 255, 0.7);
  }

  .show-more-btn {
    font-size: 0.7rem;
    color: rgb(255, 255, 255);
    background: rgba(255, 255, 255, 0.25);
    border: 1px solid rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 0.4rem 0.6rem;
    border-radius: 999px;
    transition: all 0.2s;
    white-space: nowrap;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }

  .show-more-btn:hover {
    background: rgba(255, 255, 255, 0.35);
    color: white;
    border-color: rgba(255, 255, 255, 0.7);
  }

  /* iPhone SE */
  @media (max-width: 375px) {
    .recent-chip {
      max-width: 75px;
      font-size: 0.7rem;
      padding: 0.35rem 0.6rem;
    }

    .show-more-btn {
      font-size: 0.65rem;
      padding: 0.35rem 0.5rem;
    }

    .recent-compact {
      padding: 0.75rem 1rem;
    }
  }
</style>
