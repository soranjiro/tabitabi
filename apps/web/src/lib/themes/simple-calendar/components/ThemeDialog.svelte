<script lang="ts">
  import type { ItineraryResponse } from "@tabitabi/types";
  import { getAvailableThemes } from "$lib/themes";

  interface Props {
    show: boolean;
    selectedThemeId: string;
    itinerary: ItineraryResponse;
    onSelectTheme: (themeId: string) => void;
    onClose: () => void;
  }

  let { show, selectedThemeId, itinerary, onSelectTheme, onClose }: Props =
    $props();

  const themes = getAvailableThemes();
</script>

{#if show}
  <div class="dialog-overlay" onclick={onClose}>
    <div class="dialog" onclick={(e) => e.stopPropagation()}>
      <h2>テーマを選択</h2>
      <div class="theme-list">
        {#each themes as theme (theme.id)}
          <button
            class="theme-option"
            class:selected={theme.id === selectedThemeId}
            onclick={() => {
              onSelectTheme(theme.id);
              onClose();
            }}
          >
            <span class="theme-name">{theme.name}</span>
            <span class="theme-desc">{theme.description}</span>
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  .dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog {
    background: white;
    padding: 24px;
    border-radius: 12px;
    max-width: 400px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }

  .dialog h2 {
    margin: 0 0 16px 0;
    font-size: 16px;
    color: #1f2937;
  }

  .theme-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .theme-option {
    padding: 12px;
    border: 1px solid #d0d0d0;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }

  .theme-option:hover {
    border-color: #2563eb;
    background: #f9fbff;
  }

  .theme-option.selected {
    border-color: #2563eb;
    background: #f0f4ff;
    font-weight: 600;
  }

  .theme-name {
    display: block;
    font-size: 13px;
    color: #1f2937;
    font-weight: 500;
  }

  .theme-desc {
    display: block;
    font-size: 12px;
    color: #999;
    margin-top: 2px;
  }
</style>
