<script lang="ts">
  import "../styles/ThemeSelectorPopup.css";

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
