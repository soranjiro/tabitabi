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
    removedTitle?: string | null;
    onRestore?: () => void;
  }

  let { items, onRemove, removedTitle = null, onRestore }: Props = $props();

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  }
</script>

{#if items.length > 0 || removedTitle}
  <section class="recent-section" aria-labelledby="recent-title">
    {#if items.length > 0}
      <div class="recent-heading">
        <h3 id="recent-title">最近のしおり</h3>
        <span>この端末で開いたしおり</span>
      </div>

      <div class="recent-list">
        {#each items as item}
          <article class="recent-item">
            <button onclick={() => goto("/itineraries/" + item.id)} class="recent-link">
              <span class="recent-name">{item.title}</span>
              <span class="recent-date">{formatDate(item.visitedAt)}</span>
            </button>

            <details class="recent-actions">
              <summary aria-label="{item.title}の操作">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="19" cy="12" r="1.5" />
                </svg>
              </summary>
              <div class="action-menu">
                <button type="button" onclick={() => onRemove(item.id)}>履歴から削除</button>
              </div>
            </details>
          </article>
        {/each}
      </div>
    {/if}

    {#if removedTitle && onRestore}
      <div class="undo-toast" role="status" aria-live="polite">
        <span>「{removedTitle}」を履歴から削除しました</span>
        <button type="button" onclick={onRestore}>元に戻す</button>
      </div>
    {/if}
  </section>
{/if}

<style>
  .recent-section {
    width: 100%;
    padding: 6px 0 0;
  }

  .recent-heading {
    display: flex;
    margin-bottom: 14px;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
  }

  .recent-heading h3 {
    margin: 0;
    color: var(--home-ink-strong);
    font-family: var(--home-font-serif);
    font-size: 20px;
    font-weight: 600;
  }

  .recent-heading span {
    color: var(--home-muted);
    font-size: 12px;
  }

  .recent-list {
    display: grid;
    gap: 8px;
  }

  .recent-item {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 44px;
    gap: 8px;
    align-items: center;
  }

  .recent-link {
    display: grid;
    width: 100%;
    min-height: 56px;
    padding: 11px 16px;
    border: 1px solid var(--home-border);
    border-radius: var(--home-radius-md);
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    color: var(--home-ink-strong);
    background: rgba(255,255,255,.72);
    text-align: left;
    cursor: pointer;
    transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
  }

  .recent-link:hover {
    border-color: #b5c0ca;
    background: white;
    box-shadow: var(--home-shadow-sm);
  }

  .recent-link:focus-visible,
  .recent-actions summary:focus-visible,
  .action-menu button:focus-visible,
  .undo-toast button:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-focus) 45%, white);
    outline-offset: 2px;
  }

  .recent-name {
    overflow: hidden;
    font-size: 14px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .recent-date {
    color: #5f7081;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .recent-actions {
    position: relative;
    width: 44px;
    height: 44px;
  }

  .recent-actions summary {
    display: grid;
    width: 44px;
    height: 44px;
    border: 1px solid transparent;
    border-radius: var(--home-radius-sm);
    place-items: center;
    color: var(--home-muted);
    cursor: pointer;
    list-style: none;
  }

  .recent-actions summary::-webkit-details-marker { display: none; }

  .recent-actions summary:hover {
    border-color: var(--home-border);
    background: white;
  }

  .recent-actions svg {
    width: 22px;
    height: 22px;
    fill: currentColor;
  }

  .action-menu {
    position: absolute;
    z-index: 4;
    right: 0;
    top: 48px;
    width: 154px;
    padding: 6px;
    border: 1px solid var(--home-border);
    border-radius: var(--home-radius-md);
    background: white;
    box-shadow: var(--home-shadow-md);
  }

  .action-menu button {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border: 0;
    border-radius: var(--home-radius-sm);
    color: var(--home-danger);
    background: transparent;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
    text-align: left;
    cursor: pointer;
  }

  .action-menu button:hover { background: #fff4f4; }

  .undo-toast {
    display: flex;
    min-height: 52px;
    margin-top: 12px;
    padding: 10px 12px 10px 16px;
    border: 1px solid var(--home-border);
    border-radius: var(--home-radius-md);
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    color: var(--home-ink);
    background: white;
    box-shadow: var(--home-shadow-sm);
    font-size: 12px;
  }

  .undo-toast span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .undo-toast button {
    min-height: 36px;
    padding: 7px 10px;
    border: 0;
    border-radius: var(--home-radius-sm);
    color: var(--home-action);
    background: var(--home-surface-soft);
    font: inherit;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
    flex: 0 0 auto;
  }

  @media (max-width: 560px) {
    .recent-heading {
      align-items: flex-start;
      flex-direction: column;
      gap: 3px;
    }

    .recent-link {
      min-height: 58px;
      padding: 11px 13px;
      gap: 10px;
    }

    .recent-name { font-size: 13px; }

    .undo-toast {
      align-items: flex-start;
    }

    .undo-toast span {
      white-space: normal;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .recent-link { transition: none; }
  }
</style>
