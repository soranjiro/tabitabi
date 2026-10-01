<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { itineraryApi } from "$lib/api/itinerary";
  import { auth } from "$lib/auth";
  import { defaultThemeId, getAvailableThemes, getThemePreset } from "$lib/themes/catalog";
  import { resolveSharedItineraryPath } from "./shared-url";

  let title = $state("");
  let password = $state("");
  let usePassword = $state(false);
  let theme_id = $state(defaultThemeId);
  let creating = $state(false);
  let createSucceeded = $state(false);
  let titleError = $state("");
  let titleInput = $state<HTMLInputElement | null>(null);

  let activeTab = $state<"create" | "open">("create");
  let url = $state("");
  let urlError = $state("");

  let themeCarousel = $state<HTMLElement | null>(null);
  let themeScrollFrame = 0;
  let themeLoopSettleTimer: ReturnType<typeof setTimeout> | undefined;

  const themes = getAvailableThemes();
  const themeCopies = [0, 1, 2] as const;
  const middleThemeCopy = 1;

  async function createItinerary() {
    titleError = "";

    if (!title.trim()) {
      titleError = "タイトルを入力してください";
      requestAnimationFrame(() => titleInput?.focus());
      return;
    }

    creating = true;
    createSucceeded = false;
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

      creating = false;
      createSucceeded = true;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reducedMotion) {
        await new Promise((resolve) => setTimeout(resolve, 180));
      }

      await goto("/itineraries/" + created.id);
    } catch (error) {
      console.error("Failed to create:", error);
      alert("しおりの作成に失敗しました");
    } finally {
      creating = false;
      createSucceeded = false;
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

  function findClosestThemeCard(themeId?: string) {
    if (!themeCarousel) return undefined;

    const carouselRect = themeCarousel.getBoundingClientRect();
    const carouselCenter = carouselRect.left + carouselRect.width / 2;
    const selector = themeId
      ? `[data-theme-id="${themeId}"]`
      : "[data-theme-id]";
    let closestCard: HTMLElement | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const item of themeCarousel.querySelectorAll<HTMLElement>(selector)) {
      const rect = item.getBoundingClientRect();
      const itemCenter = rect.left + rect.width / 2;
      const distance = Math.abs(itemCenter - carouselCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestCard = item;
      }
    }

    return closestCard;
  }

  function scrollThemeCardIntoCenter(
    card: HTMLElement,
    behavior: ScrollBehavior,
  ) {
    if (!themeCarousel) return;

    themeCarousel.scrollTo({
      left:
        card.offsetLeft -
        (themeCarousel.clientWidth - card.clientWidth) / 2,
      behavior,
    });
  }

  function recenterThemeLoop(themeId: string) {
    const middleCard = themeCarousel?.querySelector<HTMLElement>(
      `[data-theme-copy="${middleThemeCopy}"][data-theme-id="${themeId}"]`,
    );

    if (middleCard) {
      scrollThemeCardIntoCenter(middleCard, "auto");
    }
  }

  function queueThemeLoopRecentering() {
    if (themeLoopSettleTimer) {
      clearTimeout(themeLoopSettleTimer);
    }

    themeLoopSettleTimer = setTimeout(() => {
      const closestCard = findClosestThemeCard();
      const themeId = closestCard?.dataset.themeId;
      const copy = Number(closestCard?.dataset.themeCopy);

      if (themeId && copy !== middleThemeCopy) {
        recenterThemeLoop(themeId);
      }
    }, 120);
  }

  onMount(() => {
    const initialFrame = requestAnimationFrame(() => {
      recenterThemeLoop(theme_id);
    });

    return () => {
      cancelAnimationFrame(initialFrame);
      cancelAnimationFrame(themeScrollFrame);
      if (themeLoopSettleTimer) {
        clearTimeout(themeLoopSettleTimer);
      }
    };
  });

  function selectTheme(themeId: string) {
    theme_id = themeId;

    requestAnimationFrame(() => {
      const closestCard = findClosestThemeCard(themeId);
      if (!closestCard) return;

      scrollThemeCardIntoCenter(
        closestCard,
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
      );
    });
  }

  function moveTheme(direction: -1 | 1) {
    const currentIndex = themes.findIndex((theme) => theme.id === theme_id);
    const nextIndex = (currentIndex + direction + themes.length) % themes.length;
    const nextTheme = themes[nextIndex];

    if (nextTheme) {
      selectTheme(nextTheme.id);
    }
  }

  function getThemeLabel(theme: (typeof themes)[number]) {
    return theme.id === "planning-draft" ? "予定表" : theme.name;
  }

  function handleThemeScroll() {
    cancelAnimationFrame(themeScrollFrame);
    if (themeLoopSettleTimer) {
      clearTimeout(themeLoopSettleTimer);
    }

    themeScrollFrame = requestAnimationFrame(() => {
      const closestCard = findClosestThemeCard();
      const closestThemeId = closestCard?.dataset.themeId;

      if (closestThemeId && closestThemeId !== theme_id) {
        theme_id = closestThemeId;
      }

      if (
        closestCard &&
        Number(closestCard.dataset.themeCopy) !== middleThemeCopy
      ) {
        queueThemeLoopRecentering();
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
      <div class="form-group title-group">
        <label for="title" class="form-label">
          旅のタイトル <span class="required" aria-hidden="true">*</span>
        </label>
        <input
          id="title"
          type="text"
          bind:value={title}
          bind:this={titleInput}
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
        <legend class="form-label">表示スタイル</legend>
        <div class="theme-carousel-shell">
          <button
            type="button"
            class="theme-arrow previous"
            aria-label="前の表示スタイル"
            onclick={() => moveTheme(-1)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6.5-5.5 5.5 5.5 5.5" /></svg>
          </button>
          <div
          class="theme-carousel"
          bind:this={themeCarousel}
          onscroll={handleThemeScroll}
          aria-label="表示スタイルを横にスクロールして選択"
        >
          {#each themeCopies as copy}
            {#each themes as theme}
              <button
                type="button"
                class="theme-card"
                class:selected={theme_id === theme.id}
                aria-pressed={theme_id === theme.id}
                data-theme-id={theme.id}
                data-theme-copy={copy}
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
              <span class="theme-name">{getThemeLabel(theme)}</span>
              </button>
            {/each}
          {/each}
          </div>
          <button
            type="button"
            class="theme-arrow next"
            aria-label="次の表示スタイル"
            onclick={() => moveTheme(1)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6.5 5.5 5.5-5.5 5.5" /></svg>
          </button>
        </div>
      </fieldset>

      <div class="password-setting">
        <label class="toggle-setting">
          <span class="toggle-copy">
            <span class="lock-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3" /><rect x="5" y="10" width="14" height="10" rx="2" /></svg>
            </span>
            <strong>パスワードで保護する</strong>
          </span>
          <input type="checkbox" role="switch" bind:checked={usePassword} aria-label="パスワードで保護する" />
          <span class="toggle-track" aria-hidden="true"><i></i></span>
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

      <button type="submit" disabled={creating || createSucceeded} class:success={createSucceeded} class="btn-submit">
        {#if creating}
          <span class="submit-spinner" aria-hidden="true"></span>
          <span>作成中…</span>
        {:else if createSucceeded}
          <span class="success-check" aria-hidden="true">✓</span>
          <span>作成しました</span>
        {:else}
          <span>しおりを作る</span>
          <span class="submit-arrow" aria-hidden="true">→</span>
        {/if}
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
    border: 1px solid color-mix(in srgb, var(--home-border) 82%, white);
    border-radius: 22px;
    background: color-mix(in srgb, var(--home-surface) 97%, var(--home-paper));
    box-shadow: 0 18px 48px rgba(33, 51, 70, .09);
  }

  .tab-bar {
    display: flex;
    gap: 5px;
    margin: 10px 10px 0;
    padding: 4px;
    border-radius: 14px;
    background: rgba(242,241,237,.88);
  }

  .tab-btn {
    position: relative;
    flex: 1;
    min-height: 44px;
    padding: 9px 16px;
    border: 0;
    border-radius: 10px;
    color: #566a7d;
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
    gap: 17px;
    padding: 24px 30px 30px;
  }

  .form-group { margin: 0; }

  .title-group .form-label {
    margin-bottom: 9px;
    font-size: 15px;
  }

  .title-group .form-input {
    min-height: 54px;
    border-color: color-mix(in srgb, var(--home-border) 82%, var(--home-ink-strong));
    font-size: 16px;
    font-weight: 600;
  }

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

  .theme-carousel-shell {
    position: relative;
    margin-inline: -14px;
  }

  .theme-carousel {
    --theme-card-width: clamp(118px, 31vw, 132px);
    display: flex;
    width: 100%;
    margin-top: 0;
    padding: 3px calc(50% - (var(--theme-card-width) / 2)) 6px;
    gap: 10px;
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
    padding: 6px;
    border: 1px solid var(--home-border);
    border-radius: var(--home-radius-md);
    scroll-snap-align: center;
    color: var(--home-ink);
    background: white;
    font: inherit;
    cursor: pointer;
    opacity: .72;
    transform: scale(.975);
    transition:
      opacity 160ms ease,
      border-color 160ms ease,
      box-shadow 160ms ease,
      transform 160ms ease;
  }

  .theme-card.selected {
    border-color: var(--home-action);
    box-shadow: 0 5px 14px rgba(49,91,125,.11);
    opacity: 1;
    transform: scale(1);
  }

  .theme-name {
    display: block;
    padding: 6px 2px 1px;
    color: var(--home-ink-strong);
    font-size: 12px;
    font-weight: 800;
    line-height: 1.35;
    text-align: center;
  }

  .theme-preview {
    position: relative;
    display: block;
    height: 52px;
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

  .planning-map i { top: 12px; left: 12px; }
  .planning-map b { top: 35px; right: 10px; }
  .planning-map em { top: 22px; left: 27px; }

  .planning-list {
    display: grid;
    padding: 9px 7px;
    align-content: start;
    gap: 6px;
    background: white;
  }

  .planning-list i {
    height: 7px;
    border-left: 3px solid #6f918a;
    border-radius: 2px;
    background: #edf1f2;
  }

  .theme-preview.daycard {
    padding: 6px;
    background: #fff5f7;
  }

  .day-tabs {
    display: flex;
    height: 9px;
    margin-bottom: 4px;
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
    height: 35px;
    padding: 5px;
    border: 1px solid #ead9de;
    border-radius: 7px;
    align-content: start;
    gap: 3px;
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
    padding: 6px;
    align-content: start;
    gap: 4px;
    background: #f2f7fc;
  }

  .accordion-row {
    position: relative;
    display: block;
    height: 12px;
    border: 1px solid #d8e4ef;
    border-radius: 5px;
    background: white;
  }

  .accordion-row b {
    position: absolute;
    top: 4px;
    left: 6px;
    width: 42%;
    height: 3px;
    border-radius: 2px;
    background: #8aa7c0;
  }

  .accordion-row.open { height: 23px; }

  .accordion-row.open i {
    position: absolute;
    right: 6px;
    bottom: 4px;
    left: 6px;
    height: 5px;
    border-radius: 3px;
    background: #edf2f6;
  }

  .theme-preview.list {
    display: grid;
    padding: 7px;
    align-content: start;
    gap: 5px;
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
    padding: 6px;
    grid-template-columns: repeat(3, 1fr);
    gap: 5px;
    background: #faf5f0;
  }

  .week-column {
    display: grid;
    padding: 4px 3px;
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
    height: 10px;
    border-radius: 3px;
    background: #efe5dd;
  }

  .week-column:nth-child(2) i { height: 20px; }

  .theme-preview.month {
    padding: 6px;
    background: #f4f8fb;
  }

  .month-head {
    display: block;
    width: 46%;
    height: 5px;
    margin-bottom: 5px;
    border-radius: 3px;
    background: #7892aa;
  }

  .month-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .month-grid i {
    height: 8px;
    border: 1px solid #d8e2ea;
    border-radius: 2px;
    background: white;
  }

  .month-grid i:nth-child(5),
  .month-grid i:nth-child(10) {
    background: #dce8f1;
  }

  .theme-arrow {
    position: absolute;
    z-index: 3;
    top: 50%;
    display: grid;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 1px solid color-mix(in srgb, var(--home-border) 84%, white);
    border-radius: 50%;
    place-items: center;
    color: var(--home-action);
    background: rgba(255,255,255,.96);
    box-shadow: 0 5px 14px rgba(37, 57, 76, .10);
    cursor: pointer;
    transform: translateY(-50%);
  }

  .theme-arrow.previous { left: 1px; }
  .theme-arrow.next { right: 1px; }

  .theme-arrow svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .theme-arrow:hover {
    background: white;
    box-shadow: 0 7px 18px rgba(37, 57, 76, .15);
  }

  .password-setting {
    display: grid;
    gap: 10px;
    padding-top: 2px;
  }

  .toggle-setting {
    position: relative;
    display: flex;
    min-height: 44px;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    cursor: pointer;
  }

  .toggle-copy {
    display: inline-flex;
    min-width: 0;
    align-items: center;
    gap: 9px;
  }

  .lock-icon {
    display: grid;
    width: 28px;
    height: 28px;
    flex: 0 0 auto;
    place-items: center;
    color: #6f8293;
  }

  .lock-icon svg {
    width: 19px;
    height: 19px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .toggle-setting strong {
    color: var(--home-ink);
    font-size: 13px;
    font-weight: 700;
  }

  .toggle-setting input {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .toggle-track {
    position: relative;
    width: 46px;
    height: 26px;
    flex: 0 0 auto;
    border-radius: 999px;
    background: #d9dee2;
    transition: background-color 160ms ease;
  }

  .toggle-track i {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    box-shadow: 0 2px 5px rgba(30,45,58,.2);
    transition: transform 160ms ease;
  }

  .toggle-setting input:checked + .toggle-track {
    background: var(--home-action);
  }

  .toggle-setting input:checked + .toggle-track i {
    transform: translateX(20px);
  }

  .toggle-setting input:focus-visible + .toggle-track {
    outline: 3px solid color-mix(in srgb, var(--home-focus) 28%, transparent);
    outline-offset: 2px;
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

  .btn-submit:active:not(:disabled) {
    transform: scale(.985);
  }

  .submit-arrow {
    display: inline-block;
    transition: transform 150ms ease;
  }

  .btn-submit:hover:not(:disabled) .submit-arrow {
    transform: translateX(4px);
  }

  .submit-spinner {
    width: 17px;
    height: 17px;
    border: 2px solid rgba(255,255,255,.38);
    border-top-color: white;
    border-radius: 50%;
    animation: submit-spin .7s linear infinite;
  }

  .btn-submit.success {
    background: #477b70;
  }

  .success-check {
    display: grid;
    width: 20px;
    height: 20px;
    border: 1.5px solid rgba(255,255,255,.85);
    border-radius: 50%;
    place-items: center;
    font-size: 12px;
  }

  @keyframes submit-spin {
    to { transform: rotate(360deg); }
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
      gap: 16px;
      padding: 20px 18px 22px;
    }

    .title-group .form-input {
      min-height: 54px;
    }

    .theme-carousel-shell {
      margin-inline: -18px;
    }

    .theme-carousel {
      --theme-card-width: clamp(118px, 34vw, 128px);
      width: 100%;
    }

    .theme-arrow.previous { left: 2px; }
    .theme-arrow.next { right: 2px; }

    .toggle-setting {
      min-height: 42px;
    }

    .btn-submit {
      min-height: 50px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .tab-btn,
    .theme-card,
    .theme-arrow,
    .form-input,
    .btn-submit,
    .submit-arrow,
    .toggle-track,
    .toggle-track i {
      transition: none;
    }

    .submit-spinner {
      animation: none;
    }
  }
</style>
