<script lang="ts">
  import { type ViewMode, VIEW_MODE_OPTIONS } from "../utils/storage";
  import "../styles/ViewModeSelector.css";

  interface Props {
    currentMode: ViewMode;
    onModeChange: (mode: ViewMode) => void;
    onClose: () => void;
  }

  let { currentMode, onModeChange, onClose }: Props = $props();

  function handleModeSelect(mode: ViewMode) {
    onModeChange(mode);
    onClose();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }
</script>

<div
  class="standard-viewmode-backdrop"
  onclick={handleBackdropClick}
  onkeydown={(e) => e.key === "Escape" && onClose()}
  role="dialog"
  aria-modal="true"
  aria-label="ビューモード選択"
  tabindex="-1"
>
  <div class="standard-viewmode-popup">
    <h3 class="standard-viewmode-title">ビューモード</h3>
    <div class="standard-viewmode-options">
      {#each VIEW_MODE_OPTIONS as option}
        <button
          type="button"
          class="standard-viewmode-option"
          class:active={currentMode === option.id}
          onclick={() => handleModeSelect(option.id)}
        >
          <span class="standard-viewmode-icon">{option.icon}</span>
          <span class="standard-viewmode-label">{option.label}</span>
          {#if currentMode === option.id}
            <svg
              class="standard-viewmode-check"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>
