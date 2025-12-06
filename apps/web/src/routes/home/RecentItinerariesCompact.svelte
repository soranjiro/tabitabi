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
        その他↓
      </button>
    </div>
  </div>
{/if}

<style>
  .recent-compact {
    margin: 1rem auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(6px);
    padding: 0.875rem 1rem;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .recent-label {
    font-weight: 700;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.85;
  }

  .recent-row {
    display: flex;
    flex-wrap: nowrap;
    gap: 0.4rem;
    align-items: center;
  }

  .recent-chip {
    font-size: 0.7rem;
    font-weight: 600;
    color: white;
    background: rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.4);
    padding: 0.35rem 0.6rem;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.15s;
    max-width: 95px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }

  .recent-chip:hover {
    background: rgba(255, 255, 255, 0.28);
    border-color: rgba(255, 255, 255, 0.6);
  }

  .show-more-btn {
    font-size: 0.75rem;
    color: white;
    background: rgba(125, 125, 125, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 0.35rem 0.5rem;
    border-radius: 20px;
    transition: all 0.15s;
    white-space: nowrap;
    font-weight: 700;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    min-width: 24px;
    text-align: center;
  }

  .show-more-btn:hover {
    background: rgba(125, 125, 125, 0.28);
    border-color: rgba(255, 255, 255, 0.6);
  }
</style>
