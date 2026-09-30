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

  const themeGuidance: Record<string, { hint: string; summary: string }> = {
    "planning-draft": {
      hint: "迷ったらこれ",
      summary: "候補を集めて、地図を見ながら予定を決めたい旅に。",
    },
    daycard: {
      hint: "日ごとに見やすい",
      summary: "1日ずつカードを切り替えて、予定を確認したい旅に。",
    },
    accordion: {
      hint: "全体を見渡せる",
      summary: "日程をまとめて見つつ、必要な部分だけ開きたい旅に。",
    },
    list: {
      hint: "シンプル",
      summary: "予定を上から順番に、すっきり一覧で見たい旅に。",
    },
    week: {
      hint: "日程を比較",
      summary: "数日分の予定を横に並べて、流れを比べたい旅に。",
    },
    month: {
      hint: "日付を俯瞰",
      summary: "旅行前後も含め、月のカレンダーで予定を見たい旅に。",
    },
  };

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
        <p class="theme-help">旅の見方に合わせて選べます。あとから変更できます。</p>

        <div class="theme-grid">
          {#each themes as theme}
            {@const guidance = themeGuidance[theme.id]}
            <button
              type="button"
              class="theme-option"
              class:selected={theme_id === theme.id}
              aria-pressed={theme_id === theme.id}
              onclick={() => (theme_id = theme.id)}
            >
              <span class="theme-preview" class:planning={theme.id === "planning-draft"} class:daycard={theme.id === "daycard"} class:accordion={theme.id === "accordion"} class:list={theme.id === "list"} class:week={theme.id === "week"} class:month={theme.id === "month"} aria-hidden="true">
                {#if theme.id === "planning-draft"}
                  <span class="planning-map"><i></i><b></b><em></em></span>
                  <span class="planning-list"><i></i><i></i><i></i></span>
                {:else if theme.id === "daycard"}
                  <span class="day-tabs"><i></i><i></i><i></i></span>
                  <span class="day-card"><b></b><i></i><i></i><i></i></span>
                {:else if theme.id === "accordion"}
                  <span class="accordion-row open"><b></b><i></i></span>
                  <span class="accordion-row"><b></b></span>
                  <span class="accordion-row"><b></b></span>
                {:else if theme.id === "list"}
                  <span class="list-line"><b></b><i></i></span>
                  <span class="list-line"><b></b><i></i></span>
                  <span class="list-line"><b></b><i></i></span>
                  <span class="list-line"><b></b><i></i></span>
                {:else if theme.id === "week"}
                  <span class="week-column"><b></b><i></i><i></i></span>
                  <span class="week-column"><b></b><i></i></span>
                  <span class="week-column"><b></b><i></i><i></i></span>
                {:else if theme.id === "month"}
                  <span class="month-head"></span>
                  <span class="month-grid">
                    {#each Array(14) as _}
                      <i></i>
                    {/each}
                  </span>
                {/if}
              </span>

              <span class="theme-heading">
                <span class="theme-name">{theme.name}</span>
                {#if guidance}
                  <span class="theme-hint">{guidance.hint}</span>
                {/if}
              </span>
              <span class="theme-description">{guidance?.summary ?? theme.description}</span>
            </button>
          {/each}
        </div>
      </fieldset>

      <div class="password-setting">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={usePassword} />
          <span>
            <strong>パスワードで保護する</strong>
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

  .theme-help {
    margin: -2px 0 12px;
    color: var(--home-muted);
    font-size: 12px;
    line-height: 1.55;
  }

  .theme-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .theme-option {
    display: grid;
    min-width: 0;
    min-height: 190px;
    padding: 11px;
    border: 1px solid var(--home-border);
    border-radius: var(--home-radius-md);
    align-content: start;
    gap: 7px;
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
    height: 82px;
    overflow: hidden;
    border: 1px solid #e1e6ea;
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

  .planning-map i { top: 17px; left: 14px; }
  .planning-map b { top: 44px; right: 11px; }
  .planning-map em { top: 28px; left: 31px; }

  .planning-list {
    display: grid;
    padding: 13px 9px;
    align-content: start;
    gap: 9px;
    background: white;
  }

  .planning-list i {
    height: 9px;
    border-left: 3px solid #6f918a;
    border-radius: 2px;
    background: #edf1f2;
  }

  .theme-preview.daycard {
    padding: 8px;
    background: #fff5f7;
  }

  .day-tabs {
    display: flex;
    height: 12px;
    margin-bottom: 5px;
    gap: 4px;
  }

  .day-tabs i {
    width: 22px;
    border-radius: 4px 4px 0 0;
    background: #ead0d8;
  }

  .day-tabs i:first-child { background: #cf8096; }

  .day-card {
    display: grid;
    height: 51px;
    padding: 8px;
    border: 1px solid #ead9de;
    border-radius: 7px;
    align-content: start;
    gap: 5px;
    background: white;
  }

  .day-card b {
    width: 48%;
    height: 5px;
    border-radius: 3px;
    background: #bf7288;
  }

  .day-card i {
    height: 4px;
    border-radius: 3px;
    background: #ece5e7;
  }

  .day-card i:last-child { width: 68%; }

  .theme-preview.accordion {
    display: grid;
    padding: 9px;
    align-content: start;
    gap: 5px;
    background: #f2f7fc;
  }

  .accordion-row {
    position: relative;
    display: block;
    height: 16px;
    border: 1px solid #d8e4ef;
    border-radius: 5px;
    background: white;
  }

  .accordion-row b {
    position: absolute;
    top: 5px;
    left: 7px;
    width: 42%;
    height: 4px;
    border-radius: 2px;
    background: #8aa7c0;
  }

  .accordion-row.open { height: 31px; }

  .accordion-row.open i {
    position: absolute;
    right: 7px;
    bottom: 6px;
    left: 7px;
    height: 7px;
    border-radius: 3px;
    background: #edf2f6;
  }

  .theme-preview.list {
    display: grid;
    padding: 10px;
    align-content: start;
    gap: 7px;
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
    height: 6px;
    border-radius: 3px;
    background: #e8ecef;
  }

  .list-line:nth-child(2) i { width: 78%; }
  .list-line:nth-child(3) i { width: 90%; }
  .list-line:nth-child(4) i { width: 62%; }

  .theme-preview.week {
    display: grid;
    padding: 8px;
    grid-template-columns: repeat(3, 1fr);
    gap: 5px;
    background: #faf5f0;
  }

  .week-column {
    display: grid;
    padding: 6px 4px;
    border-radius: 5px;
    align-content: start;
    gap: 5px;
    background: white;
  }

  .week-column b {
    height: 5px;
    border-radius: 3px;
    background: #b48b70;
  }

  .week-column i {
    height: 14px;
    border-radius: 3px;
    background: #efe5dd;
  }

  .week-column:nth-child(2) i { height: 28px; }

  .theme-preview.month {
    padding: 8px;
    background: #f4f8fb;
  }

  .month-head {
    display: block;
    width: 46%;
    height: 6px;
    margin-bottom: 7px;
    border-radius: 3px;
    background: #7892aa;
  }

  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
  }

  .month-grid i {
    height: 12px;
    border: 1px solid #d8e2ea;
    border-radius: 2px;
    background: white;
  }

  .month-grid i:nth-child(5),
  .month-grid i:nth-child(10) {
    background: #dce8f1;
  }

  .theme-heading {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
  }

  .theme-name {
    overflow: hidden;
    color: var(--home-ink-strong);
    font-size: 13px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .theme-hint {
    flex: 0 0 auto;
    padding: 3px 6px;
    border-radius: var(--home-radius-pill);
    color: var(--home-action);
    background: color-mix(in srgb, var(--home-action) 9%, white);
    font-size: 10px;
    font-weight: 900;
    white-space: nowrap;
  }

  .theme-description {
    display: -webkit-box;
    overflow: hidden;
    color: var(--home-muted);
    font-size: 12px;
    line-height: 1.45;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }

  .password-setting {
    display: grid;
    gap: 14px;
    padding: 18px;
    border: 1px solid var(--home-border);
    border-radius: var(--home-radius-md);
    background: var(--home-surface-soft);
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
    font-size: 14px;
  }

  .checkbox-label small {
    color: var(--home-muted);
    font-size: 12px;
    line-height: 1.5;
  }

  .password-group {
    padding-top: 13px;
    border-top: 1px solid var(--home-border);
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

    .theme-grid {
      display: flex;
      margin-right: -18px;
      padding: 2px 18px 5px 0;
      gap: 10px;
      overflow-x: auto;
      scroll-snap-type: x proximity;
      scrollbar-width: thin;
    }

    .theme-option {
      width: 206px;
      min-width: 206px;
      min-height: 208px;
      scroll-snap-align: start;
    }

    .theme-preview { height: 92px; }

    .password-setting { padding: 16px; }
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
