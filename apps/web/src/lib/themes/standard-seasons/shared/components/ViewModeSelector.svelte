<script lang="ts">
  import { type ViewMode, VIEW_MODE_OPTIONS } from '../utils/storage';

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
  onkeydown={(e) => e.key === 'Escape' && onClose()}
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
            <svg class="standard-viewmode-check" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>

<style>
  .standard-viewmode-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 300;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 100px;
    animation: fadeIn 0.2s ease-out;
  }

  .standard-viewmode-popup {
    background: #fff;
    border-radius: 16px;
    box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.15);
    min-width: 260px;
    max-width: calc(100vw - 32px);
    overflow: hidden;
    animation: slideUp 0.25s ease-out;
  }

  .standard-viewmode-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--standard-text-light);
    padding: 1rem 1rem 0.5rem;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .standard-viewmode-options {
    padding: 0.5rem;
  }

  .standard-viewmode-option {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 0.875rem 1rem;
    background: transparent;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition: background 0.15s;
    font-family: inherit;
    text-align: left;
  }

  .standard-viewmode-option:hover {
    background: rgba(0, 0, 0, 0.04);
  }

  .standard-viewmode-option.active {
    background: rgba(169, 53, 41, 0.08);
  }

  .standard-viewmode-icon {
    font-size: 1.25rem;
  }

  .standard-viewmode-label {
    flex: 1;
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--standard-text);
  }

  .standard-viewmode-check {
    width: 20px;
    height: 20px;
    color: var(--standard-primary);
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
