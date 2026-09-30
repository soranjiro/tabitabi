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

  let themeCarousel = $state<HTMLElement | null>(null);
  let themeScrollFrame = 0;

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

  function selectTheme(themeId: string) {
    theme_id = themeId;

    requestAnimationFrame(() => {
      themeCarousel
        ?.querySelector<HTMLElement>(`[data-theme-id="${themeId}"]`)
        ?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          block: "nearest",
          inline: "center",
        });
    });
  }

  function handleThemeScroll() {
    cancelAnimationFrame(themeScrollFrame);
    themeScrollFrame = requestAnimationFrame(() => {
      if (!themeCarousel) return;

      const carouselRect = themeCarousel.getBoundingClientRect();
      const carouselCenter = carouselRect.left + carouselRect.width / 2;
      let closestThemeId: string | undefined;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (const item of themeCarousel.querySelectorAll<HTMLElement>("[data-theme-id]")) {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.left + rect.width / 2;
        const distance = Math.abs(itemCenter - carouselCenter);

        if (distance < closestDistance) {
          closestDistance = distance;
          closestThemeId = item.dataset.themeId;
        }
      }

      if (closestThemeId && closestThemeId !== theme_id) {
        theme_id = closestThemeId;
      }
    });
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
        <div
          class="theme-carousel"
          bind:this={themeCarousel}
          onscroll={handleThemeScroll}
          aria-label="デザインテーマを横にスクロールして選択"
        >
          {#each themes as theme}
            <button
              type="button"
              class="theme-card"
              class:selected={theme_id === theme.id}
              aria-pressed={theme_id === theme.id}
              data-theme-id={theme.id}
              onclick={() => selectTheme(theme.id)}
            >
              <span
                class="theme-preview"
                class:planning={theme.id === "planning-draft"}
                class:daycard={theme.id === "daycard"}
                class:accordion={theme.id === "accordion"}
                class:list={theme.id === "list"}
                class:week={theme.id === "week"}
                class:month={theme.id === "month"}
                aria-hidden="true"
              >
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
              <span class="theme-name">{theme.name}</span>
            </button>
          {/each}
        </div>
      </fieldset>

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
  .theme-card:focus-visible,
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

  .theme-carousel {
    --theme-card-width: 180px;
    display: flex;
    width: 100%;
    margin-top: 2px;
    padding: 4px calc(50% - (var(--theme-card-width) / 2)) 8px;
    gap: 12px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-padding-inline: calc(50% - (var(--theme-card-width) / 2));
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }

  .theme-carousel::-webkit-scrollbar {
    display: none;
  }

  .theme-card {
    width: var(--theme-card-width);
    min-width: var(--theme-card-width);
    padding: 8px;
    border: 1px solid var(--home-border);
    border-radius: var(--home-radius-md);
    scroll-snap-align: center;
    color: var(--home-ink);
    background: white;
    font: inherit;
    cursor: pointer;
    opacity: .58;
    transform: scale(.94);
    transition:
      opacity 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
  }

  .theme-card.selected {
    border-color: var(--home-action);
    box-shadow: 0 5px 16px rgba(49,91,125,.13);
    opacity: 1;
    transform: scale(1);
  }

  .theme-name {
    display: block;
    padding: 8px 4px 2px;
    color: var(--home-ink-strong);
    font-size: 13px;
    font-weight: 800;
    text-align: center;
  }

  .theme-preview {
    position: relative;
    display: block;
    height: 82px;
    overflow: hidden;
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

    .theme-carousel {
      --theme-card-width: 168px;
      margin-inline: -18px;
      width: calc(100% + 36px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tab-btn,
    .theme-card,
    .form-input,
    .btn-submit {
      transition: none;
    }
  }
</style>
