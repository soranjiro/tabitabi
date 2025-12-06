<script lang="ts">
  import { goto } from "$app/navigation";
  import { getAvailableThemes, type AvailableTheme } from "$lib/themes";
  import { demoStorage, getDemoData } from "$lib/demo";

  interface Props {
    open: boolean;
    onClose: () => void;
  }

  let { open, onClose }: Props = $props();

  const themes = getAvailableThemes();

  function selectTheme(themeId: string) {
    // Initialize demo with selected theme's data
    const demoData = getDemoData(themeId as AvailableTheme);
    demoStorage.initializeDemo(demoData);

    // Navigate to demo page
    goto(`/demo?theme=${themeId}`);
    onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }

  function handleBackdropKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="modal-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="demo-selector-title"
    tabindex="0"
    onclick={handleBackdropClick}
    onkeydown={handleBackdropKeydown}
  >
    <div class="modal-content">
      <h2 id="demo-selector-title" class="modal-title">テーマを選択</h2>
      <p class="modal-subtitle">デモで試したいテーマを選んでください</p>

      <div class="theme-grid">
        {#each themes as theme}
          <button class="theme-card" onclick={() => selectTheme(theme.id)}>
            <span class="theme-name">{theme.name}</span>
            <span class="theme-desc">{theme.description}</span>
          </button>
        {/each}
      </div>

      <button type="button" class="close-btn" onclick={onClose}>
        キャンセル
      </button>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  }

  .modal-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #374151;
    margin: 0 0 0.25rem;
    text-align: center;
  }

  .modal-subtitle {
    font-size: 0.85rem;
    color: #6b7280;
    text-align: center;
    margin: 0 0 1.25rem;
  }

  .theme-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .theme-card {
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    padding: 1rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .theme-card:hover {
    border-color: #6b8cce;
    background: rgba(107, 140, 206, 0.05);
    transform: translateY(-2px);
  }

  .theme-card:active {
    transform: scale(0.98);
  }

  .theme-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: #374151;
  }

  .theme-desc {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .close-btn {
    width: 100%;
    padding: 0.75rem;
    background: #f3f4f6;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    color: #6b7280;
    cursor: pointer;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: #e5e7eb;
    color: #374151;
  }
</style>
