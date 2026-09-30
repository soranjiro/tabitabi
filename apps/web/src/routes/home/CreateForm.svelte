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

      <div class="form-group">
        <label for="theme" class="form-label">デザイン</label>
        <select id="theme" bind:value={theme_id} class="form-input theme-select">
          {#each themes as theme}
            <option value={theme.id}>{theme.name}</option>
          {/each}
        </select>

        <div class="selected-theme-preview" aria-hidden="true">
          <span
            class="theme-preview"
            class:planning={theme_id === "planning-draft"}
            class:daycard={theme_id === "daycard"}
            class:accordion={theme_id === "accordion"}
            class:list={theme_id === "list"}
            class:week={theme_id === "week"}
            class:month={theme_id === "month"}
          >
            {#if theme_id === "planning-draft"}
              <span class="planning-map"><i></i><b></b><em></em></span>
              <span class="planning-list"><i></i><i></i><i></i></span>
            {:else if theme_id === "daycard"}
              <span class="day-tabs"><i></i><i></i><i></i></span>
              <span class="day-card"><b></b><i></i><i></i><i></i></span>
            {:else if theme_id === "accordion"}
              <span class="accordion-row open"><b></b><i></i></span>
              <span class="accordion-row"><b></b></span>
              <span class="accordion-row"><b></b></span>
            {:else if theme_id === "list"}
              <span class="list-line"><b></b><i></i></span>
              <span class="list-line"><b></b><i></i></span>
              <span class="list-line"><b></b><i></i></span>
              <span class="list-line"><b></b><i></i></span>
            {:else if theme_id === "week"}
              <span class="week-column"><b></b><i></i><i></i></span>
              <span class="week-column"><b></b><i></i></span>
              <span class="week-column"><b></b><i></i><i></i></span>
            {:else if theme_id === "month"}
              <span class="month-head"></span>
              <span class="month-grid">
                {#each Array(14) as _}
                  <i></i>
                {/each}
              </span>
            {/if}
          </span>
        </div>
      </div>

      <div class="password-setting">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={usePassword} />
          <strong>パスワードで保護する</strong>
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

  .theme-select {
    cursor: pointer;
  }

  .selected-theme-preview {
    width: 154px;
    margin-top: 10px;
  }

  .theme-preview {
    position: relative;
    display: block;
    height: 72px;
    overflow: hidden;
    border: 1px solid var(--home-border);
    border-radius: 8px;
    background: #f6f8f9;
  }

  .theme-preview.planning {
    display: grid;
    grid-template-columns: 47% 53%;
    background: #eef3f2;
  }

  .planning-map {
    position: relative;
    border-right: 1px solid #d8e1df;
    background:
      linear-gradient(35deg, transparent 46%, #d6e1de 47% 51%, transparent 52%),
      linear-gradient(-24deg, transparent 43%, #dce7e4 44% 48%, transparent 49%),
      #edf4f1;
  }

  .planning-map i,
  .planning-map b,
  .planning-map em {
    position: absolute;
    width: 7px;
    height: 7px;
    border: 2px solid #527e76;
    border-radius: 50% 50% 50% 0;
    background: white;
    transform: rotate(-45deg);
  }

  .planning-map i { top: 14px; left: 12px; }
  .planning-map b { top: 39px; right: 9px; }
  .planning-map em { top: 25px; left: 27px; }

  .planning-list {
    display: grid;
    padding: 11px 8px;
    align-content: start;
    gap: 8px;
    background: white;
  }

  .planning-list i {
    height: 8px;
    border-left: 3px solid #6f918a;
    border-radius: 2px;
    background: #edf1f2;
  }

  .theme-preview.daycard {
    padding: 7px;
    background: #fff5f7;
  }

  .day-tabs {
    display: flex;
    height: 10px;
    margin-bottom: 4px;
    gap: 4px;
  }

  .day-tabs i {
    width: 20px;
    border-radius: 4px 4px 0 0;
    background: #ead0d8;
  }

  .day-tabs i:first-child { background: #cf8096; }

  .day-card {
    display: grid;
    height: 43px;
    padding: 7px;
    border: 1px solid #ead9de;
    border-radius: 6px;
    align-content: start;
    gap: 4px;
    background: white;
  }

  .day-card b {
    width: 48%;
    height: 4px;
    border-radius: 3px;
    background: #bf7288;
  }

  .day-card i {
    height: 3px;
    border-radius: 3px;
    background: #ece5e7;
  }

  .day-card i:last-child { width: 68%; }

  .theme-preview.accordion {
    display: grid;
    padding: 8px;
    align-content: start;
    gap: 4px;
    background: #f2f7fc;
  }

  .accordion-row {
    position: relative;
    display: block;
    height: 14px;
    border: 1px solid #d8e4ef;
    border-radius: 5px;
    background: white;
  }

  .accordion-row b {
    position: absolute;
    top: 4px;
    left: 6px;
    width: 42%;
    height: 4px;
    border-radius: 2px;
    background: #8aa7c0;
  }

  .accordion-row.open { height: 26px; }

  .accordion-row.open i {
    position: absolute;
    right: 6px;
    bottom: 5px;
    left: 6px;
    height: 6px;
    border-radius: 3px;
    background: #edf2f6;
  }

  .theme-preview.list {
    display: grid;
    padding: 9px;
    align-content: start;
    gap: 6px;
    background: white;
  }

  .list-line {
    display: grid;
    grid-template-columns: 7px minmax(0, 1fr);
    align-items: center;
    gap: 7px;
  }

  .list-line b {
    width: 7px;
    height: 7px;
    border: 2px solid #71879b;
    border-radius: 50%;
  }

  .list-line i {
    height: 5px;
    border-radius: 3px;
    background: #e8ecef;
  }

  .list-line:nth-child(2) i { width: 78%; }
  .list-line:nth-child(3) i { width: 90%; }
  .list-line:nth-child(4) i { width: 62%; }

  .theme-preview.week {
    display: grid;
    padding: 7px;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    background: #faf5f0;
  }

  .week-column {
    display: grid;
    padding: 5px 3px;
    border-radius: 5px;
    align-content: start;
    gap: 4px;
    background: white;
  }

  .week-column b {
    height: 4px;
    border-radius: 3px;
    background: #b48b70;
  }

  .week-column i {
    height: 12px;
    border-radius: 3px;
    background: #efe5dd;
  }

  .week-column:nth-child(2) i { height: 24px; }

  .theme-preview.month {
    padding: 7px;
    background: #f4f8fb;
  }

  .month-head {
    display: block;
    width: 46%;
    height: 5px;
    margin-bottom: 6px;
    border-radius: 3px;
    background: #7892aa;
  }

  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
  }

  .month-grid i {
    height: 10px;
    border: 1px solid #d8e2ea;
    border-radius: 2px;
    background: white;
  }

  .month-grid i:nth-child(5),
  .month-grid i:nth-child(10) {
    background: #dce8f1;
  }

  .password-setting {
    display: grid;
    gap: 12px;
  }

  .checkbox-label {
    display: inline-flex;
    width: fit-content;
    min-height: 44px;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    width: 20px;
    height: 20px;
    margin: 0;
    accent-color: var(--home-action);
    cursor: pointer;
    flex: 0 0 auto;
  }

  .checkbox-label strong {
    color: var(--home-ink-strong);
    font-size: 14px;
  }

  .password-group {
    margin-top: -2px;
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
    .form-body {
      gap: 22px;
      padding: 22px 18px;
    }

    .selected-theme-preview {
      width: 140px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tab-btn,
    .form-input,
    .btn-submit {
      transition: none;
    }
  }
</style>
