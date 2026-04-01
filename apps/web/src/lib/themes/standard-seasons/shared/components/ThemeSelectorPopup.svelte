<script lang="ts">
  interface ThemeOption {
    id: string;
    name: string;
    description?: string;
  }

  interface Props {
    open: boolean;
    themes: ThemeOption[];
    selectedThemeId: string;
    onThemeChange: (themeId: string) => void;
    onClose: () => void;
  }

  let { open, themes, selectedThemeId, onThemeChange, onClose }: Props =
    $props();

  function handleThemeSelect(themeId: string) {
    onThemeChange(themeId);
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
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <div
    class="theme-selector-backdrop"
    role="dialog"
    aria-modal="true"
    aria-labelledby="theme-selector-title"
    tabindex="-1"
    onclick={handleBackdropClick}
    onkeydown={(e) =>
      e.key === "Escape" && handleBackdropClick(e as unknown as MouseEvent)}
  >
    <div class="theme-selector-content">
      <h2 id="theme-selector-title" class="theme-selector-title">
        テーマを選択
      </h2>
      <p class="theme-selector-subtitle">表示するテーマを選んでください</p>

      <div class="theme-selector-grid">
        {#each themes as theme}
          <button
            class="theme-selector-card"
            class:active={selectedThemeId === theme.id}
            onclick={() => handleThemeSelect(theme.id)}
          >
            <div class="theme-selector-card-inner">
              <span class="theme-selector-name">{theme.name}</span>
              <span class="theme-selector-desc">{theme.description || ""}</span>
            </div>
            {#if selectedThemeId === theme.id}
              <svg
                class="theme-selector-check"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            {/if}
          </button>
        {/each}
      </div>

      <button type="button" class="theme-selector-close-btn" onclick={onClose}>
        キャンセル
      </button>
    </div>
  </div>
{/if}

<style>
  .theme-selector-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
    animation: fadeIn 0.2s ease-out;
  }

  .theme-selector-content {
    background: white;
    border-radius: 16px;
    padding: 1.5rem;
    max-width: 400px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
    animation: slideUp 0.25s ease-out;
  }

  .theme-selector-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #374151;
    margin: 0 0 0.25rem;
    text-align: center;
  }

  .theme-selector-subtitle {
    font-size: 0.85rem;
    color: #6b7280;
    text-align: center;
    margin: 0 0 1.25rem;
  }

  .theme-selector-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .theme-selector-card {
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    padding: 1rem;
    text-align: left;
    cursor: pointer;
    transition:
      border-color 0.2s,
      background 0.2s,
      transform 0.2s;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    position: relative;
  }

  .theme-selector-card:hover {
    border-color: #6b8cce;
    background: rgba(107, 140, 206, 0.05);
    transform: translateY(-2px);
  }

  .theme-selector-card:active {
    transform: scale(0.98);
  }

  .theme-selector-card.active {
    border-color: #6b8cce;
    background: rgba(107, 140, 206, 0.1);
  }

  .theme-selector-card-inner {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .theme-selector-name {
    font-weight: 600;
    font-size: 0.9rem;
    color: #374151;
  }

  .theme-selector-desc {
    font-size: 0.75rem;
    color: #9ca3af;
  }

  .theme-selector-check {
    width: 20px;
    height: 20px;
    color: #6b8cce;
    flex-shrink: 0;
  }

  .theme-selector-close-btn {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    color: #6b7280;
    font-weight: 500;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .theme-selector-close-btn:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .theme-selector-close-btn:active {
    transform: scale(0.98);
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(16px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
</style>
