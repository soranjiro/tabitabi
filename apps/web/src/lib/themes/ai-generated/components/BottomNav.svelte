<script lang="ts">
  import { getAvailableThemes } from "$lib/themes";

  interface Props {
    hasEditPermission: boolean;
    walicaId: string | null | undefined;
    selectedThemeId: string;
    secretModeEnabled: boolean;
    secretModeOffset: number;
    walicaUrl: string;
    onEditModeToggle: () => void;
    onThemeChange: (themeId: string) => void;
    onSecretModeChange: (enabled: boolean, offset: number) => void;
    onWalicaUpdate: (url: string) => void;
    onWalicaOpen: () => void;
    onMemoOpen: () => void;
  }

  let {
    hasEditPermission,
    walicaId,
    selectedThemeId,
    secretModeEnabled,
    secretModeOffset,
    walicaUrl,
    onEditModeToggle,
    onThemeChange,
    onSecretModeChange,
    onWalicaUpdate,
    onWalicaOpen,
    onMemoOpen,
  }: Props = $props();

  const themes = getAvailableThemes();

  let showSettings = $state(false);
  let localWalicaUrl = $state(walicaUrl);

  $effect(() => {
    localWalicaUrl = walicaUrl;
  });

  function handleWalicaSave() {
    onWalicaUpdate(localWalicaUrl);
  }
</script>

<nav class="ai-bottom-nav">
  <div class="ai-nav-content">
    <button type="button" class="ai-nav-item" onclick={onMemoOpen}>
      <span class="ai-nav-icon">📝</span>
      <span class="ai-nav-label">メモ</span>
    </button>

    {#if walicaId}
      <button type="button" class="ai-nav-item" onclick={onWalicaOpen}>
        <span class="ai-nav-icon">💰</span>
        <span class="ai-nav-label">割り勘</span>
      </button>
    {/if}

    <button
      type="button"
      class="ai-nav-item"
      class:active={showSettings}
      onclick={() => (showSettings = !showSettings)}
    >
      <span class="ai-nav-icon">⚙️</span>
      <span class="ai-nav-label">設定</span>
    </button>

    <button
      type="button"
      class="ai-nav-item"
      class:active={hasEditPermission}
      onclick={onEditModeToggle}
    >
      <span class="ai-nav-icon">{hasEditPermission ? "✓" : "✏️"}</span>
      <span class="ai-nav-label">{hasEditPermission ? "編集中" : "編集"}</span>
    </button>
  </div>
</nav>

{#if showSettings}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="ai-overlay"
    style="background: rgba(0,0,0,0.3); z-index: 150;"
    onclick={() => (showSettings = false)}
  ></div>

  <div class="ai-settings-panel">
    <div class="ai-settings-handle"></div>
    <h3 class="ai-settings-title">設定</h3>

    <div class="ai-settings-section">
      <span class="ai-settings-label">テーマ</span>
      <div class="ai-theme-grid">
        {#each themes as theme}
          <button
            type="button"
            class="ai-theme-option"
            class:selected={theme.id === selectedThemeId}
            onclick={() => onThemeChange(theme.id)}
            disabled={!hasEditPermission}
          >
            <span class="ai-theme-name">{theme.name}</span>
          </button>
        {/each}
      </div>
    </div>

    {#if hasEditPermission}
      <div class="ai-settings-section">
        <span class="ai-settings-label">機能</span>

        <div class="ai-toggle-row">
          <div class="ai-toggle-info">
            <div class="ai-toggle-title">🎭 シークレットモード</div>
            <div class="ai-toggle-desc">予定を時間まで隠す</div>
          </div>
          <button
            type="button"
            class="ai-toggle"
            class:on={secretModeEnabled}
            onclick={() =>
              onSecretModeChange(!secretModeEnabled, secretModeOffset)}
            aria-pressed={secretModeEnabled}
            aria-label="シークレットモードを切り替え"
          ></button>
        </div>

        {#if secretModeEnabled}
          <div style="padding: 0 0.75rem; margin-bottom: 0.75rem;">
            <label
              class="ai-settings-label"
              style="margin-bottom: 0.5rem;"
              for="secret-timing">公開タイミング</label
            >
            <select
              id="secret-timing"
              class="ai-select"
              value={secretModeOffset}
              onchange={(e) =>
                onSecretModeChange(
                  secretModeEnabled,
                  Number((e.target as HTMLSelectElement).value),
                )}
            >
              <option value={0}>予定時刻</option>
              <option value={30}>30分前</option>
              <option value={60}>1時間前</option>
              <option value={180}>3時間前</option>
              <option value={360}>6時間前</option>
              <option value={720}>12時間前</option>
              <option value={1440}>1日前</option>
            </select>
          </div>
        {/if}
      </div>

      <div class="ai-settings-section">
        <label class="ai-settings-label" for="walica-url">💰 Walica連携</label>
        <input
          id="walica-url"
          type="url"
          bind:value={localWalicaUrl}
          placeholder="https://walica.jp/group/..."
          class="ai-input"
          style="margin-bottom: 0.5rem;"
        />
        <button
          type="button"
          class="ai-btn ai-btn-secondary"
          style="width: 100%;"
          onclick={handleWalicaSave}
        >
          保存
        </button>
      </div>
    {/if}

    <button
      type="button"
      class="ai-btn ai-btn-secondary"
      style="width: 100%; margin-top: 0.5rem;"
      onclick={() => (showSettings = false)}
    >
      閉じる
    </button>
  </div>
{/if}

<style>
  .ai-bottom-nav {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--ai-surface);
    border-top: 1px solid var(--ai-border);
    z-index: 100;
    padding-bottom: env(safe-area-inset-bottom);
  }

  .ai-nav-content {
    display: flex;
    justify-content: space-around;
    padding: 0.5rem 0;
    max-width: 500px;
    margin: 0 auto;
  }

  .ai-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--ai-text-muted);
    transition: color 0.2s ease;
    border-radius: var(--ai-radius-md);
  }

  .ai-nav-item:hover,
  .ai-nav-item.active {
    color: var(--ai-accent);
  }

  .ai-nav-icon {
    font-size: 1.25rem;
  }

  .ai-nav-label {
    font-size: 0.625rem;
    font-weight: 500;
  }

  .ai-settings-panel {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--ai-surface);
    border-radius: 1.5rem 1.5rem 0 0;
    padding: 1rem 1.5rem 2rem;
    padding-bottom: calc(2rem + env(safe-area-inset-bottom));
    z-index: 200;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
    animation: slideUp 0.3s ease;
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  .ai-settings-handle {
    width: 40px;
    height: 4px;
    background: var(--ai-border);
    border-radius: 2px;
    margin: 0 auto 1rem;
  }

  .ai-settings-title {
    margin: 0 0 1.25rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--ai-text-primary);
  }

  .ai-settings-section {
    margin-bottom: 1.25rem;
  }

  .ai-settings-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ai-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.75rem;
  }

  .ai-theme-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .ai-theme-option {
    padding: 0.75rem;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
  }

  .ai-theme-option:hover:not(:disabled) {
    border-color: var(--ai-accent);
  }

  .ai-theme-option.selected {
    background: rgba(14, 165, 233, 0.08);
    border-color: var(--ai-accent);
  }

  .ai-theme-option:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ai-theme-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--ai-text-primary);
  }

  .ai-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    background: var(--ai-surface-hover);
    border-radius: var(--ai-radius-md);
    margin-bottom: 0.5rem;
  }

  .ai-toggle-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .ai-toggle-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--ai-text-primary);
  }

  .ai-toggle-desc {
    font-size: 0.75rem;
    color: var(--ai-text-muted);
  }

  .ai-toggle {
    position: relative;
    width: 44px;
    height: 24px;
    background: var(--ai-border);
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.2s ease;
  }

  .ai-toggle::after {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s ease;
  }

  .ai-toggle.on {
    background: var(--ai-accent);
  }

  .ai-toggle.on::after {
    transform: translateX(20px);
  }

  .ai-select {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.875rem;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-md);
    color: var(--ai-text-primary);
    cursor: pointer;
  }

  .ai-select:focus {
    outline: none;
    border-color: var(--ai-accent);
  }

  .ai-input {
    width: 100%;
    padding: 0.75rem;
    font-size: 0.875rem;
    background: var(--ai-surface);
    border: 1px solid var(--ai-border);
    border-radius: var(--ai-radius-md);
    color: var(--ai-text-primary);
  }

  .ai-input:focus {
    outline: none;
    border-color: var(--ai-accent);
  }

  .ai-btn {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
    font-weight: 500;
    border: none;
    border-radius: var(--ai-radius-md);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .ai-btn-secondary {
    background: var(--ai-surface-hover);
    color: var(--ai-text-primary);
  }

  .ai-btn-secondary:hover {
    background: var(--ai-border);
  }

  .ai-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.3);
    z-index: 150;
  }
</style>
