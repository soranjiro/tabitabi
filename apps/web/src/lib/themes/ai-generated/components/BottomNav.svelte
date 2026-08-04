<script lang="ts">
  import { getAvailableThemes } from "$lib/themes";

  interface Props {
    hasEditPermission: boolean;
    canRequestEdit?: boolean;
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
    canRequestEdit = true,
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

    {#if hasEditPermission}
      <button
        type="button"
        class="ai-nav-item"
        class:active={showSettings}
        onclick={() => (showSettings = !showSettings)}
      >
        <span class="ai-nav-icon">⚙️</span>
        <span class="ai-nav-label">設定</span>
      </button>
    {/if}

    {#if hasEditPermission || canRequestEdit}
      <button
        type="button"
        class="ai-nav-item"
        class:active={hasEditPermission}
        onclick={onEditModeToggle}
      >
        <span class="ai-nav-icon">{hasEditPermission ? "✓" : "✏️"}</span>
        <span class="ai-nav-label">{hasEditPermission ? "編集中" : "編集"}</span>
      </button>
    {/if}
  </div>
</nav>

{#if showSettings}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="ai-overlay ai-overlay-settings"
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
          <div class="ai-secret-timing-section">
            <label
              class="ai-settings-label ai-settings-label-spaced"
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
          class="ai-input ai-input-spaced"
        />
        <button
          type="button"
          class="ai-btn ai-btn-secondary ai-btn-full"
          onclick={handleWalicaSave}
        >
          保存
        </button>
      </div>
    {/if}

    <button
      type="button"
      class="ai-btn ai-btn-secondary ai-btn-full ai-btn-close"
      onclick={() => (showSettings = false)}
    >
      閉じる
    </button>
  </div>
{/if}
