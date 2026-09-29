<script lang="ts">
  import { goto } from "$app/navigation";
  import { itineraryApi } from "$lib/api/itinerary";
  import { auth } from "$lib/auth";
  import { defaultThemeId, getAvailableThemes, getThemePreset } from "$lib/themes/catalog";
  import { resolveSharedItineraryPath } from "./shared-url";

  let title = $state("");
  let password = $state("");
  let usePassword = $state(false);
  let theme_id = $state(defaultThemeId);
  let creating = $state(false);
  let titleError = $state("");

  let activeTab = $state<"create" | "open">("create");
  let url = $state("");
  let urlError = $state("");

  const themes = getAvailableThemes();

  async function createItinerary() {
    titleError = "";

    if (!title.trim()) {
      titleError = "タイトルを入力してください";
      return;
    }

    creating = true;
    try {
      const created = await itineraryApi.create({
        title: title.trim(),
        theme_id,
        palette_id: getThemePreset(theme_id).defaultPaletteId,
        password: usePassword && password.trim() ? password.trim() : undefined,
      });

      if (created.token) {
        auth.setToken(created.id, created.title, created.token);
      }

      goto("/itineraries/" + created.id);
    } catch (error) {
      console.error("Failed to create:", error);
      alert("しおりの作成に失敗しました");
    } finally {
      creating = false;
    }
  }

  function handleUrlSubmit() {
    urlError = "";

    if (!url.trim()) {
      urlError = "URLを入力してください";
      return;
    }

    const destination = resolveSharedItineraryPath(url, window.location.origin);

    if (!destination) {
      urlError = "たびたびのしおりURLを入力してください";
      return;
    }

    goto(destination);
  }
</script>

<div class="form-card">
  <div class="tab-bar" role="tablist" aria-label="しおりを開く方法">
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === "create"}
      onclick={() => (activeTab = "create")}
      class:active={activeTab === "create"}
      class="tab-btn"
    >
      新しく作る
    </button>
    <button
      type="button"
      role="tab"
      aria-selected={activeTab === "open"}
      onclick={() => (activeTab = "open")}
      class:active={activeTab === "open"}
      class="tab-btn"
    >
      URLから開く
    </button>
  </div>

  {#if activeTab === "create"}
    <form
      class="form-body"
      onsubmit={(event) => {
        event.preventDefault();
        createItinerary();
      }}
    >
      <div class="form-group">
        <label for="title" class="form-label">
          旅のタイトル <span class="required" aria-hidden="true">*</span>
        </label>
        <input
          id="title"
          type="text"
          bind:value={title}
          placeholder="例：秋の金沢旅行"
          class:error={Boolean(titleError)}
          class="form-input"
          aria-invalid={Boolean(titleError)}
          aria-describedby={titleError ? "title-error" : undefined}
        />
        {#if titleError}
          <p id="title-error" class="form-error">{titleError}</p>
        {/if}
      </div>

      <fieldset class="theme-fieldset">
        <legend class="form-label">デザイン</legend>
        <div class="theme-grid">
          {#each themes as theme}
            <button
              type="button"
              class="theme-option"
              class:selected={theme_id === theme.id}
              aria-pressed={theme_id === theme.id}
              onclick={() => (theme_id = theme.id)}
            >
              <span class="theme-preview" class:planning={theme.id === "planning-draft"} class:daycard={theme.id === "daycard"} class:accordion={theme.id === "accordion"} class:list={theme.id === "list"} class:week={theme.id === "week"} class:month={theme.id === "month"} aria-hidden="true">
                <span class="theme-preview-bar"></span>
                <span class="theme-preview-line"></span>
                <span class="theme-preview-line short"></span>
                <span class="theme-preview-dot"></span>
              </span>
              <span class="theme-name">{theme.name}</span>
              <span class="theme-description">{theme.description}</span>
            </button>
          {/each}
        </div>
      </fieldset>

      <details class="advanced-settings">
        <summary>詳細設定</summary>
        <div class="advanced-body">
          <label class="checkbox-label">
            <input type="checkbox" bind:checked={usePassword} />
            <span>
              <strong>編集をパスワードで保護する</strong>
              <small>編集する人だけにパスワードを共有します。</small>
            </span>
          </label>

          {#if usePassword}
            <div class="password-group">
              <label for="password" class="form-label">編集用パスワード</label>
              <input
                id="password"
                type="password"
                bind:value={password}
                placeholder="パスワードを入力"
                class="form-input"
              />
            </div>
          {/if}
        </div>
      </details>

      <button type="submit" disabled={creating} class="btn-submit">
        {creating ? "作成中..." : "しおりを作る"} <span aria-hidden="true">→</span>
      </button>
    </form>
  {:else}
    <form
      class="form-body open-form"
      onsubmit={(event) => {
        event.preventDefault();
        handleUrlSubmit();
      }}
    >
      <div class="open-intro">
        <strong>共有されたしおりを開く</strong>
        <p>たびたびの共有URLをそのまま貼り付けてください。</p>
      </div>

      <div class="form-group">
        <label for="url" class="form-label">
          しおりのURL <span class="required" aria-hidden="true">*</span>
        </label>
        <input
          id="url"
          type="url"
          bind:value={url}
          placeholder="https://tabitabi.pages.dev/s/..."
          class:error={Boolean(urlError)}
          class="form-input"
          aria-invalid={Boolean(urlError)}
          aria-describedby={urlError ? "url-error" : undefined}
        />
        {#if urlError}
          <p id="url-error" class="form-error">{urlError}</p>
        {/if}
      </div>

      <button type="submit" class="btn-submit">
        しおりを開く <span aria-hidden="true">→</span>
      </button>
    </form>
  {/if}
</div>

<style>
  .form-card {
    overflow: hidden;
    border: 1px solid var(--home-border);
    border-radius: var(--home-radius-lg);
    background: color-mix(in srgb, var(--home-surface) 96%, var(--home-paper));
    box-shadow: var(--home-shadow-md);
  }

  .tab-bar {
    display: flex;
    gap: 6px;
    padding: 8px;
    border-bottom: 1px solid var(--home-border);
    background: rgba(247,245,240,.72);
  }

  .tab-btn {
    position: relative;
    flex: 1;
    min-height: 46px;
    padding: 10px 16px;
    border: 0;
    border-radius: 10px;
    color: var(--home-muted);
    background: transparent;
    font: inherit;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    transition: color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;
  }

  .tab-btn.active {
    color: var(--home-ink-strong);
    background: white;
    box-shadow: var(--home-shadow-sm);
  }

  .tab-btn:focus-visible,
  .theme-option:focus-visible,
  summary:focus-visible,
  .btn-submit:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--home-focus) 45%, white);
    outline-offset: 2px;
  }

  .form-body {
    display: grid;
    gap: 24px;
    padding: 30px;
  }

  .form-group { margin: 0; }

  .form-label {
    display: block;
    margin: 0 0 9px;
    color: var(--home-ink-strong);
    font-size: 14px;
    font-weight: 800;
  }

  .required { color: var(--home-danger); }

  .form-input {
    width: 100%;
    min-height: 50px;
    padding: 12px 14px;
    border: 1px solid var(--home-border);
    border-radius: var(--home-radius-md);
    color: var(--home-ink-strong);
    background: white;
    font: inherit;
    font-size: 16px;
    transition: border-color 160ms ease, box-shadow 160ms ease;
  }

  .form-input::placeholder { color: #8996a4; }

  .form-input:focus {
    border-color: var(--home-focus);
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--home-focus) 18%, transparent);
  }

  .form-input.error { border-color: var(--home-danger); }

  .form-error {
    margin: 8px 0 0;
    color: var(--home-danger);
    font-size: 13px;
    font-weight: 700;
  }

  .theme-fieldset {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .theme-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .theme-option {
    display: grid;
    min-width: 0;
    min-height: 142px;
    padding: 11px;
    border: 1px solid var(--home-border);
    border-radius: var(--home-radius-md);
    align-content: start;
    gap: 6px;
    color: var(--home-ink);
    background: white;
    text-align: left;
    cursor: pointer;
    transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
  }

  .theme-option:hover {
    border-color: #afbbc6;
    transform: translateY(-1px);
  }

  .theme-option.selected {
    border-color: var(--home-action);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--home-action) 14%, transparent);
  }

  .theme-preview {
    position: relative;
    display: block;
    height: 52px;
    overflow: hidden;
    border-radius: 8px;
    background: #f1f3f4;
  }

  .theme-preview::after {
    position: absolute;
    right: 9px;
    bottom: 8px;
    left: 9px;
    height: 15px;
    border-radius: 4px;
    background: rgba(255,255,255,.82);
    content: "";
  }

  .theme-preview-bar {
    position: absolute;
    inset: 0 0 auto;
    height: 17px;
    background: #d8e1e7;
  }

  .theme-preview-line,
  .theme-preview-line.short {
    position: absolute;
    z-index: 1;
    left: 13px;
    bottom: 17px;
    width: 40%;
    height: 2px;
    border-radius: 2px;
    background: #8394a4;
  }

  .theme-preview-line.short {
    bottom: 11px;
    width: 28%;
  }

  .theme-preview-dot {
    position: absolute;
    z-index: 2;
    right: 16px;
    bottom: 12px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #668fb2;
  }

  .theme-preview.planning { background: linear-gradient(135deg, #edf3f1 45%, #d5e3df 45%); }
  .theme-preview.daycard { background: linear-gradient(135deg, #fff1f4, #f6dce4); }
  .theme-preview.accordion { background: linear-gradient(135deg, #eef5ff, #dce9f8); }
  .theme-preview.list { background: linear-gradient(180deg, #f5f7f8, #e7ebef); }
  .theme-preview.week { background: linear-gradient(90deg, #f5e7dc 33%, #f8f1ea 33% 66%, #ead9ca 66%); }
  .theme-preview.month { background: linear-gradient(90deg, #edf3f8 25%, #fafcfd 25% 50%, #edf3f8 50% 75%, #fafcfd 75%); }

  .theme-name {
    overflow: hidden;
    color: var(--home-ink-strong);
    font-size: 13px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .theme-description {
    display: -webkit-box;
    overflow: hidden;
    color: var(--home-muted);
    font-size: 12px;
    line-height: 1.45;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .advanced-settings {
    border-top: 1px solid var(--home-border);
    border-bottom: 1px solid var(--home-border);
  }

  .advanced-settings summary {
    min-height: 46px;
    display: flex;
    align-items: center;
    color: var(--home-ink);
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }

  .advanced-body {
    display: grid;
    gap: 18px;
    padding: 2px 0 18px;
  }

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
    margin-top: 1px;
    accent-color: var(--home-action);
    cursor: pointer;
    flex: 0 0 auto;
  }

  .checkbox-label span {
    display: grid;
    gap: 3px;
  }

  .checkbox-label strong {
    color: var(--home-ink-strong);
    font-size: 13px;
  }

  .checkbox-label small {
    color: var(--home-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .password-group {
    padding: 15px;
    border-radius: var(--home-radius-md);
    background: var(--home-surface-soft);
  }

  .password-group .form-label { margin-bottom: 8px; }

  .btn-submit {
    display: flex;
    width: 100%;
    min-height: 52px;
    padding: 14px 20px;
    border: 0;
    border-radius: var(--home-radius-md);
    align-items: center;
    justify-content: center;
    gap: 18px;
    color: white;
    background: var(--home-action);
    box-shadow: 0 10px 24px rgba(49,91,125,.18);
    font: inherit;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    transition: background-color 160ms ease, transform 160ms ease, box-shadow 160ms ease;
  }

  .btn-submit:hover:not(:disabled) {
    background: var(--home-action-hover);
    transform: translateY(-1px);
    box-shadow: 0 13px 28px rgba(49,91,125,.24);
  }

  .btn-submit:disabled {
    opacity: .65;
    cursor: not-allowed;
  }

  .open-form { gap: 22px; }

  .open-intro {
    padding: 16px 18px;
    border-radius: var(--home-radius-md);
    background: var(--home-surface-soft);
  }

  .open-intro strong {
    color: var(--home-ink-strong);
    font-size: 14px;
  }

  .open-intro p {
    margin: 5px 0 0;
    color: var(--home-muted);
    font-size: 12px;
    line-height: 1.6;
  }

  @media (max-width: 720px) {
    .form-body { padding: 22px 18px; }

    .theme-grid {
      display: flex;
      margin-right: -18px;
      padding-right: 18px;
      gap: 10px;
      overflow-x: auto;
      scroll-snap-type: x proximity;
      scrollbar-width: thin;
    }

    .theme-option {
      width: 154px;
      min-width: 154px;
      min-height: 140px;
      scroll-snap-align: start;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tab-btn,
    .theme-option,
    .form-input,
    .btn-submit {
      transition: none;
    }
  }
</style>
