<script lang="ts">
  import { onMount } from "svelte";
  import type { ItineraryResponse, Step, StepType } from "@tabitabi/types";
  import { STEP_TYPE } from "@tabitabi/types";
  import { auth } from "$lib/auth";
  import { authApi } from "$lib/api/auth";
  import { handlePasswordAuth } from "$lib/auth/handle-password-auth";
  import { getIsDemoMode } from "$lib/demo";
  import { getMemoText, updateMemoText } from "$lib/memo";
  import { getAvailableThemes } from "$lib/themes/catalog";
  import {
    getStepSchedule,
    getStepTimeLabel,
    updateStepSchedule,
    type SchedulePrecision,
  } from "$lib/planning/schedule";
  import BottomNav from "../standard/core/components/BottomNav.svelte";
  import MoreMenu from "../standard/core/components/MoreMenu.svelte";
  import PasswordDialog from "../standard/core/components/PasswordDialog.svelte";
  import ShareDialog from "../standard/core/components/ShareDialog.svelte";
  import MoneyOverlay from "$lib/features/money/MoneyOverlay.svelte";
  import PackingOverlay from "$lib/features/packing/PackingOverlay.svelte";
  import { openPrintStudio } from "$lib/print";
  import "../standard/core/styles/index.css";

  interface Props {
    itinerary: ItineraryResponse;
    steps: Step[];
    onUpdateItinerary?: (data: { title?: string; theme_id?: string; memo?: string }) => Promise<void>;
    onCreateStep?: (data: {
      title: string;
      start_at: number;
      end_at: number;
      notes?: string;
      type?: StepType;
      is_all_day?: boolean;
    }) => Promise<void>;
    onUpdateStep?: (stepId: string, data: {
      title?: string;
      start_at?: number;
      end_at?: number;
      notes?: string;
      type?: StepType;
      is_all_day?: boolean;
    }) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
  }

  let { itinerary, steps, onUpdateItinerary, onCreateStep, onUpdateStep, onDeleteStep }: Props = $props();

  type ScreenMode = "plan" | "preview";
  type WhenChoice = "undecided" | "day";

  let screenMode = $state<ScreenMode>("plan");
  let hasEditPermission = $state(false);
  let editingTitle = $state(false);
  let titleDraft = $state("");
  let sheetOpen = $state(false);
  let editingStep = $state<Step | null>(null);
  let saving = $state(false);
  let memoOpen = $state(true);
  let memoDraft = $state("");
  let themeChoicesOpen = $state(false);
  let showMoreMenu = $state(false);
  let showPasswordDialog = $state(false);
  let showShareDialog = $state(false);
  let showMoney = $state(false);
  let showPacking = $state(false);
  let isAuthenticating = $state(false);
  let showCopyMessage = $state(false);

  const isSharedSnapshot = $derived(!!itinerary.source_itinerary_id);

  let form = $state({
    title: "",
    note: "",
    when: "undecided" as WhenChoice,
    day: 1,
    time: "",
  });

  const otherThemes = getAvailableThemes().filter((theme) => theme.id !== "planning-draft");

  onMount(() => {
    titleDraft = itinerary.title;
    memoDraft = getMemoText(itinerary.memo);
    if (getIsDemoMode()) {
      hasEditPermission = true;
      return;
    }
    const token = auth.extractTokenFromUrl();
    if (token && itinerary.is_password_protected) auth.setToken(itinerary.id, itinerary.title, token);
    hasEditPermission = !isSharedSnapshot && auth.hasEditPermission(itinerary.id);
    if (!hasEditPermission && !itinerary.is_password_protected && !isSharedSnapshot) hasEditPermission = true;
    if (hasEditPermission) auth.updateAccessTime(itinerary.id, itinerary.title);
  });

  async function onPasswordAuth(password: string) {
    await handlePasswordAuth({
      shioriId: itinerary.id,
      title: itinerary.title,
      password,
      onSuccess: () => {
        hasEditPermission = true;
        showPasswordDialog = false;
      },
      onError: (message) => alert(message),
      setAuthenticating: (value) => (isAuthenticating = value),
    });
  }

  async function attemptEditModeActivation() {
    if (getIsDemoMode()) {
      hasEditPermission = true;
      return;
    }
    const token = auth.getToken(itinerary.id);
    if (token && await authApi.verifyToken(itinerary.id)) {
      hasEditPermission = true;
      auth.updateAccessTime(itinerary.id, itinerary.title);
      return;
    }
    if (!itinerary.is_password_protected && !isSharedSnapshot) {
      hasEditPermission = true;
      auth.updateAccessTime(itinerary.id, itinerary.title);
    } else {
      showPasswordDialog = true;
    }
  }

  function handleEditModeToggle() {
    if (isSharedSnapshot) return;
    if (hasEditPermission) hasEditPermission = false;
    else void attemptEditModeActivation();
  }

  async function copyShareLink(includeToken: boolean) {
    const token = includeToken ? auth.getToken(itinerary.id) : null;
    const url = `${window.location.origin}${window.location.pathname}${token ? `?token=${token}` : ""}`;
    await navigator.clipboard.writeText(url);
    showShareDialog = false;
    showCopyMessage = true;
    setTimeout(() => (showCopyMessage = false), 2000);
  }

  function localDateKey(value: number): string {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  const legacyDates = $derived.by(() => [...new Set(
    steps
      .filter((step) => getStepSchedule(step).precision === "time")
      .map((step) => localDateKey(step.start_at)),
  )].sort());

  const baseDate = $derived.by(() => {
    const scheduled = steps.filter((step) => getStepSchedule(step).precision !== "undecided");
    const source = scheduled.length
      ? Math.min(...scheduled.map((step) => {
          const day = getStepSchedule(step).day ?? 1;
          return step.start_at - (day - 1) * 24 * 60 * 60 * 1000;
        }))
      : Date.now();
    const date = new Date(source);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  });

  function dayForStep(step: Step): number | null {
    const schedule = getStepSchedule(step);
    if (schedule.precision === "undecided") return null;
    if (schedule.day) return schedule.day;
    const index = legacyDates.indexOf(localDateKey(step.start_at));
    return index >= 0 ? index + 1 : 1;
  }

  const dayCount = $derived.by(() => Math.max(
    2,
    legacyDates.length,
    ...steps.map((step) => dayForStep(step) ?? 0),
  ));

  function stepOrder(step: Step): number {
    return getStepSchedule(step).order ?? step.start_at;
  }

  const undecidedSteps = $derived.by(() => steps
    .filter((step) => getStepSchedule(step).precision === "undecided")
    .sort((a, b) => stepOrder(a) - stepOrder(b)));

  const dayGroups = $derived.by(() => Array.from({ length: dayCount }, (_, index) => ({
    day: index + 1,
    steps: steps
      .filter((step) => dayForStep(step) === index + 1)
      .sort((a, b) => {
        const aSchedule = getStepSchedule(a);
        const bSchedule = getStepSchedule(b);
        if (aSchedule.precision === "time" && bSchedule.precision === "time") return a.start_at - b.start_at;
        return stepOrder(a) - stepOrder(b);
      }),
  })).filter((group) => group.steps.length > 0 || (hasEditPermission && group.day <= Math.max(1, dayCount))));

  const isComplete = $derived(steps.length > 0 && steps.every((step) => getStepSchedule(step).precision === "time"));

  function timestampFor(day: number, time: string): number {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + day - 1);
    const [hour, minute] = (time || "12:00").split(":").map(Number);
    date.setHours(hour, minute, 0, 0);
    return date.getTime();
  }

  function openCreate() {
    editingStep = null;
    form = { title: "", note: "", when: "undecided", day: 1, time: "" };
    sheetOpen = true;
  }

  function openEdit(step: Step) {
    const schedule = getStepSchedule(step);
    const time = schedule.precision === "time"
      ? `${String(new Date(step.start_at).getHours()).padStart(2, "0")}:${String(new Date(step.start_at).getMinutes()).padStart(2, "0")}`
      : "";
    editingStep = step;
    form = {
      title: step.title,
      note: getMemoText(step.notes),
      when: schedule.precision === "undecided" ? "undecided" : "day",
      day: dayForStep(step) ?? 1,
      time,
    };
    sheetOpen = true;
  }

  function scheduleFromForm(): { precision: SchedulePrecision; day?: number; order: number } {
    if (form.when === "undecided") return { precision: "undecided", order: Date.now() };
    return {
      precision: form.time ? "time" : "day",
      day: form.day,
      order: editingStep ? (getStepSchedule(editingStep).order ?? Date.now()) : Date.now(),
    };
  }

  async function saveStep(event: SubmitEvent) {
    event.preventDefault();
    if (!form.title.trim() || saving) return;
    saving = true;
    try {
      const schedule = scheduleFromForm();
      const startAt = schedule.precision === "undecided"
        ? timestampFor(1, "12:00")
        : timestampFor(schedule.day ?? 1, form.time || "12:00");
      const notes = updateStepSchedule(
        updateMemoText(editingStep?.notes, form.note),
        schedule,
      );
      const data = {
        title: form.title.trim(),
        start_at: startAt,
        end_at: startAt + 60 * 60 * 1000,
        notes,
        type: editingStep?.type ?? STEP_TYPE.NORMAL_GENERAL,
        is_all_day: false,
      };
      if (editingStep && onUpdateStep) await onUpdateStep(editingStep.id, data);
      else if (onCreateStep) await onCreateStep(data);
      sheetOpen = false;
      editingStep = null;
    } finally {
      saving = false;
    }
  }

  async function deleteStep() {
    if (!editingStep || !onDeleteStep || !confirm(`「${editingStep.title}」を削除しますか？`)) return;
    await onDeleteStep(editingStep.id);
    sheetOpen = false;
    editingStep = null;
  }

  async function moveStep(step: Step, direction: -1 | 1, group: Step[]) {
    if (!onUpdateStep) return;
    const currentIndex = group.findIndex((item) => item.id === step.id);
    const target = group[currentIndex + direction];
    if (!target) return;
    const stepSchedule = getStepSchedule(step);
    const targetSchedule = getStepSchedule(target);
    const currentOrder = stepSchedule.order ?? currentIndex;
    const targetOrder = targetSchedule.order ?? currentIndex + direction;
    await onUpdateStep(step.id, { notes: updateStepSchedule(step.notes, { ...stepSchedule, day: dayForStep(step) ?? undefined, order: targetOrder }) });
    await onUpdateStep(target.id, { notes: updateStepSchedule(target.notes, { ...targetSchedule, day: dayForStep(target) ?? undefined, order: currentOrder }) });
  }

  async function saveTitle() {
    const value = titleDraft.trim();
    if (value && value !== itinerary.title && onUpdateItinerary) await onUpdateItinerary({ title: value });
    else titleDraft = itinerary.title;
    editingTitle = false;
  }

  async function saveMemo() {
    if (onUpdateItinerary) await onUpdateItinerary({ memo: updateMemoText(itinerary.memo, memoDraft) });
    memoOpen = false;
  }

  async function switchTheme(themeId: string) {
    if (onUpdateItinerary) await onUpdateItinerary({ theme_id: themeId });
  }
</script>

<svelte:head><meta name="theme-color" content="#faf9f5" /></svelte:head>

<div class="draft-theme">
  {#if showCopyMessage}<div class="copy-message">コピーしました</div>{/if}
  <header class="draft-header">
    <a class="brand" href="/">たびたび</a>
    {#if editingTitle}
      <input class="title-input" bind:value={titleDraft} onblur={saveTitle} onkeydown={(event) => event.key === "Enter" && saveTitle()} />
    {:else}
      <button class="title-button" onclick={() => hasEditPermission && (editingTitle = true)} disabled={!hasEditPermission}>{itinerary.title}</button>
    {/if}
    <p>まだ決まっていなくても、ここから。</p>
  </header>

  <nav class="mode-tabs" aria-label="表示切り替え">
    <button class:active={screenMode === "plan"} onclick={() => (screenMode = "plan")}>考える</button>
    <button class:active={screenMode === "preview"} onclick={() => (screenMode = "preview")}>旅程を見る</button>
  </nav>

  <main>
    {#if screenMode === "plan"}
      <section class="planning-intro">
        <span>候補を作る</span><i>→</i><span>日を決める</span><i>→</i><span>時間を決める</span>
      </section>

      {#if undecidedSteps.length > 0}
        <section class="draft-section">
          <div class="section-heading"><div><h2>まだ決めていない</h2><p>{undecidedSteps.length}件の候補</p></div></div>
          <div class="step-list">
            {#each undecidedSteps as step, index}
              <article class="step-row">
                <button class="step-main" onclick={() => hasEditPermission && openEdit(step)} disabled={!hasEditPermission}>
                  <span class="circle"></span><span><strong>{step.title}</strong>{#if getMemoText(step.notes)}<small>{getMemoText(step.notes)}</small>{/if}</span>
                </button>
                {#if hasEditPermission}<div class="order-buttons"><button onclick={() => moveStep(step, -1, undecidedSteps)} disabled={index === 0} aria-label="上へ移動">↑</button><button onclick={() => moveStep(step, 1, undecidedSteps)} disabled={index === undecidedSteps.length - 1} aria-label="下へ移動">↓</button></div>{/if}
              </article>
            {/each}
          </div>
        </section>
      {/if}

      {#each dayGroups as group}
        <section class="draft-section">
          <div class="section-heading"><div><h2>Day {group.day}</h2><p>{group.steps.length ? `${group.steps.length}件` : "予定なし"}</p></div></div>
          {#if group.steps.length}
            <div class="step-list">
              {#each group.steps as step, index}
                <article class="step-row">
                  <button class="step-main" onclick={() => hasEditPermission && openEdit(step)} disabled={!hasEditPermission}>
                    <span class="circle"></span><span><strong>{step.title}</strong><small class:time-decided={getStepSchedule(step).precision === "time"}>{getStepTimeLabel(step)}</small>{#if getMemoText(step.notes)}<small>{getMemoText(step.notes)}</small>{/if}</span>
                  </button>
                  {#if hasEditPermission}<div class="order-buttons"><button onclick={() => moveStep(step, -1, group.steps)} disabled={index === 0} aria-label="上へ移動">↑</button><button onclick={() => moveStep(step, 1, group.steps)} disabled={index === group.steps.length - 1} aria-label="下へ移動">↓</button></div>{/if}
                </article>
              {/each}
            </div>
          {/if}
        </section>
      {/each}

      {#if steps.length === 0}<div class="empty"><strong>まずは、行きたい場所をひとつ。</strong><p>日付や時間はあとで決められます。</p></div>{/if}

      {#if hasEditPermission}<button class="add-button" onclick={openCreate}>＋ 予定を追加</button>{/if}
      <button class="memo-button" onclick={() => (memoOpen = !memoOpen)}>旅のメモ {memoOpen ? "−" : "+"}</button>
      {#if memoOpen}
        <div class="memo-panel"><textarea bind:value={memoDraft} rows="6" placeholder={'例:\n□ 新幹線を予約\n□ ホテルを予約'} disabled={!hasEditPermission}></textarea>{#if hasEditPermission}<button onclick={saveMemo}>保存</button>{/if}</div>
      {/if}
    {:else}
      <div class="preview-heading"><p>旅程プレビュー</p><h2>{itinerary.title}</h2></div>
      {#if undecidedSteps.length > 0}
        <section class="preview-unscheduled"><strong>まだ決めていない予定</strong><span>{undecidedSteps.length}件</span>{#each undecidedSteps as step}<p>{step.title}</p>{/each}</section>
      {/if}
      <div class="preview-days">
        {#each dayGroups.filter((group) => group.steps.length > 0) as group}
          <section class="preview-day"><header><span>Day</span><strong>{group.day}</strong></header><ol>{#each group.steps as step}<li><time class:pending={getStepSchedule(step).precision !== "time"}>{getStepTimeLabel(step)}</time><div><strong>{step.title}</strong>{#if getMemoText(step.notes)}<small>{getMemoText(step.notes)}</small>{/if}</div></li>{/each}</ol></section>
        {/each}
      </div>
      {#if steps.length === 0}<div class="empty"><strong>旅程はまだ空です。</strong><p>「考える」から候補を追加しましょう。</p></div>{/if}

      <aside class:complete={isComplete} class="theme-guide">
        <p>{isComplete ? "予定が整いました。" : "予定が固まってきたら、"}</p>
        <strong>見るためのテーマに着替えてみませんか？</strong>
        <button onclick={() => (themeChoicesOpen = !themeChoicesOpen)}>ほかのテーマを試す</button>
        {#if themeChoicesOpen}
          <div class="theme-choices">{#each otherThemes as theme}<button onclick={() => switchTheme(theme.id)}><strong>{theme.name}</strong><small>{theme.description}</small></button>{/each}</div>
        {/if}
      </aside>
    {/if}
  </main>

  {#if sheetOpen}
    <div class="sheet-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (sheetOpen = false)}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={editingStep ? "予定を編集" : "予定を追加"}>
        <div class="sheet-handle"></div><div class="sheet-title"><h2>{editingStep ? "予定を編集" : "予定を追加"}</h2><button onclick={() => (sheetOpen = false)} aria-label="閉じる">×</button></div>
        <form onsubmit={saveStep}>
          <label>タイトル<input bind:value={form.title} placeholder="清水寺に行きたい" required /></label>
          <label>メモ<textarea bind:value={form.note} rows="3" placeholder="朝の方が空いてそう"></textarea></label>
          <fieldset><legend>いつ？</legend><label class="radio"><input type="radio" bind:group={form.when} value="undecided" />まだ決めない</label><label class="radio"><input type="radio" bind:group={form.when} value="day" />日を決める</label></fieldset>
          {#if form.when === "day"}
            <div class="date-fields"><label>日<select bind:value={form.day}>{#each Array.from({ length: dayCount + 1 }, (_, index) => index + 1) as day}<option value={day}>Day {day}</option>{/each}</select></label><label>時間<input type="time" bind:value={form.time} /><small>空欄なら未定</small></label></div>
          {/if}
          <button class="save-button" type="submit" disabled={saving}>{saving ? "保存中…" : editingStep ? "保存" : "追加"}</button>
          {#if editingStep}<button class="delete-button" type="button" onclick={deleteStep}>この予定を削除</button>{/if}
        </form>
      </div>
    </div>
  {/if}

  <BottomNav
    onMoneyOpen={() => (showMoney = true)}
    onPackingOpen={() => (showPacking = true)}
    onMenuClick={() => (showMoreMenu = true)}
  />

  <MoneyOverlay
    show={showMoney}
    itineraryId={itinerary.id}
    canEdit={hasEditPermission}
    {steps}
    onClose={() => (showMoney = false)}
  />

  <PackingOverlay
    show={showPacking}
    itineraryId={itinerary.id}
    canEdit={hasEditPermission}
    onClose={() => (showPacking = false)}
  />

  <PasswordDialog
    show={showPasswordDialog}
    {isAuthenticating}
    onAuth={onPasswordAuth}
    onClose={() => (showPasswordDialog = false)}
  />

  <ShareDialog
    show={showShareDialog}
    {hasEditPermission}
    onCopyLink={copyShareLink}
    onClose={() => (showShareDialog = false)}
  />

  <MoreMenu
    show={showMoreMenu}
    canConfigure={false}
    canRequestEdit={!isSharedSnapshot}
    {hasEditPermission}
    onShare={() => {
      if (hasEditPermission) showShareDialog = true;
      else void copyShareLink(false);
    }}
    onPrint={openPrintStudio}
    onSettings={() => {}}
    onEditModeToggle={handleEditModeToggle}
    onClose={() => (showMoreMenu = false)}
  />
</div>

<style>
  :global(body) { margin: 0; background: #faf9f5; }
  :global(*) { box-sizing: border-box; }
  .draft-theme { min-height: 100vh; padding-bottom: 7rem; color: #26332f; background: #faf9f5; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; --theme-primary: #2f6657; --theme-text: #26332f; --theme-text-light: #7a8581; --theme-border: #d9ddd9; --theme-line-color: #d9ddd9; }
  .copy-message { position: fixed; z-index: 1100; top: 1rem; left: 50%; padding: .6rem .9rem; border-radius: 999px; color: #fff; background: #2f6657; font-size: .8rem; font-weight: 700; transform: translateX(-50%); }
  .draft-header { width: min(680px, calc(100% - 32px)); margin: 0 auto; padding: 1.5rem 0 .8rem; }
  .brand { display: inline-block; margin-bottom: 2rem; color: #2f6657; font-size: .75rem; font-weight: 800; letter-spacing: .12em; text-decoration: none; }
  .title-button, .title-input { display: block; width: 100%; padding: 0; border: 0; color: #26332f; background: transparent; font: inherit; font-size: clamp(1.65rem, 6vw, 2.3rem); font-weight: 750; text-align: left; }
  .title-button:disabled { opacity: 1; }
  .title-input { border-bottom: 1px solid #91a39c; outline: none; }
  .draft-header p { margin: .55rem 0 0; color: #7a8581; font-size: .82rem; }
  .mode-tabs { position: sticky; z-index: 10; top: 0; display: grid; width: min(680px, 100%); margin: .65rem auto 0; padding: 0 16px; grid-template-columns: 1fr 1fr; background: rgba(250,249,245,.94); backdrop-filter: blur(10px); }
  .mode-tabs button { padding: .9rem; border: 0; border-bottom: 1px solid #d9ddd9; color: #7a8581; background: none; font-size: .88rem; font-weight: 700; cursor: pointer; }
  .mode-tabs button.active { border-bottom: 2px solid #2f6657; color: #2f6657; }
  main { width: min(680px, calc(100% - 32px)); margin: 0 auto; }
  .planning-intro { display: flex; margin: 1.25rem 0 1.8rem; align-items: center; justify-content: center; gap: .55rem; color: #87908c; font-size: .67rem; }
  .planning-intro span { padding: .42rem .55rem; border: 1px solid #e0e2de; border-radius: 999px; background: #fff; }
  .planning-intro i { font-style: normal; }
  .draft-section { margin: 0 0 1.65rem; }
  .section-heading { display: flex; min-height: 46px; align-items: end; justify-content: space-between; border-bottom: 1px solid #cfd5d1; }
  .section-heading h2 { margin: 0 0 .35rem; font-size: .98rem; }
  .section-heading p { margin: 0 0 .35rem; color: #9aa29e; font-size: .66rem; }
  .step-list { border-bottom: 1px solid #e5e6e3; }
  .step-row { display: grid; min-height: 68px; border-bottom: 1px solid #e5e6e3; grid-template-columns: 1fr auto; align-items: stretch; }
  .step-row:last-child { border-bottom: 0; }
  .step-main { display: grid; min-width: 0; padding: .8rem 0; border: 0; grid-template-columns: 18px 1fr; gap: .55rem; color: inherit; background: transparent; text-align: left; cursor: pointer; }
  .step-main:disabled { cursor: default; }
  .circle { width: 10px; height: 10px; margin-top: .25rem; border: 1.5px solid #638076; border-radius: 50%; }
  .step-main span:last-child { display: grid; min-width: 0; gap: .2rem; }
  .step-main strong { overflow: hidden; font-size: .9rem; text-overflow: ellipsis; white-space: nowrap; }
  .step-main small { color: #8a928e; font-size: .72rem; white-space: pre-line; }
  .step-main small.time-decided { color: #2f6657; font-weight: 700; }
  .order-buttons { display: flex; align-items: center; }
  .order-buttons button { width: 34px; height: 40px; border: 0; color: #87908c; background: transparent; cursor: pointer; }
  .order-buttons button:disabled { opacity: .18; }
  .empty { margin: 2.5rem 0; padding: 2rem 1rem; border: 1px dashed #cfd5d1; text-align: center; }
  .empty p { margin: .5rem 0 0; color: #8a928e; font-size: .78rem; }
  .add-button { position: sticky; bottom: 1rem; display: block; width: min(360px, 88%); margin: 2rem auto; padding: .9rem 1rem; border: 0; border-radius: 999px; color: white; background: #2f6657; box-shadow: 0 8px 24px rgba(47,102,87,.22); font-size: .9rem; font-weight: 750; cursor: pointer; }
  .memo-button { width: 100%; margin-top: 1rem; padding: .8rem 0; border: 0; border-bottom: 1px solid #cfd5d1; color: #4b5b55; background: transparent; text-align: left; font-weight: 700; cursor: pointer; }
  .memo-panel { display: grid; padding: .8rem 0; gap: .6rem; }
  .memo-panel textarea { width: 100%; resize: vertical; }
  .memo-panel button { justify-self: end; padding: .55rem 1rem; border: 0; border-radius: 999px; color: white; background: #2f6657; }
  .preview-heading { padding: 2.4rem 0 1.5rem; text-align: center; }
  .preview-heading p { margin: 0 0 .4rem; color: #a06d4e; font-size: .65rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
  .preview-heading h2 { margin: 0; font-size: 1.6rem; }
  .preview-unscheduled { display: grid; margin-bottom: 1.2rem; padding: 1rem; border: 1px dashed #cfd5d1; grid-template-columns: 1fr auto; gap: .35rem; }
  .preview-unscheduled span { color: #8a928e; font-size: .72rem; }
  .preview-unscheduled p { margin: 0; grid-column: 1 / -1; color: #58645f; font-size: .8rem; }
  .preview-days { display: grid; gap: 1rem; }
  .preview-day { display: grid; border: 1px solid #dde1dd; background: #fff; grid-template-columns: 70px 1fr; }
  .preview-day > header { display: grid; padding: 1rem; align-content: start; color: white; background: #3d6f61; text-align: center; }
  .preview-day > header span { font-size: .62rem; letter-spacing: .12em; text-transform: uppercase; }
  .preview-day > header strong { font-size: 1.45rem; }
  .preview-day ol { margin: 0; padding: .6rem 1rem; list-style: none; }
  .preview-day li { display: grid; min-height: 58px; padding: .7rem 0; border-bottom: 1px solid #eceeeb; grid-template-columns: 72px 1fr; gap: .65rem; }
  .preview-day li:last-child { border-bottom: 0; }
  .preview-day time { padding-top: .08rem; color: #2f6657; font-size: .75rem; font-weight: 800; }
  .preview-day time.pending { color: #a06d4e; font-weight: 650; }
  .preview-day li div { display: grid; gap: .25rem; }
  .preview-day li strong { font-size: .88rem; }
  .preview-day li small { color: #8a928e; font-size: .69rem; white-space: pre-line; }
  .theme-guide { margin: 2.5rem 0; padding: 1.35rem; border: 1px solid #e2ddd4; background: #f5f1e9; text-align: center; }
  .theme-guide.complete { border-color: #c9ddd4; background: #eff6f2; }
  .theme-guide p { margin: 0 0 .25rem; color: #7b857f; font-size: .75rem; }
  .theme-guide > strong { display: block; margin-bottom: 1rem; font-size: .9rem; }
  .theme-guide > button { padding: .65rem 1rem; border: 1px solid #2f6657; border-radius: 999px; color: #2f6657; background: transparent; font-weight: 700; cursor: pointer; }
  .theme-choices { display: grid; margin-top: 1rem; gap: .45rem; text-align: left; }
  .theme-choices button { display: grid; padding: .7rem .8rem; border: 1px solid #d9ddd9; color: #26332f; background: #fff; text-align: left; cursor: pointer; }
  .theme-choices small { margin-top: .15rem; color: #7a8581; }
  .sheet-backdrop { position: fixed; z-index: 100; inset: 0; display: flex; align-items: end; justify-content: center; background: rgba(24,35,31,.34); }
  .sheet { width: min(600px, 100%); max-height: 92dvh; overflow: auto; padding: .6rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom)); border-radius: 20px 20px 0 0; background: #fff; box-shadow: 0 -12px 40px rgba(0,0,0,.12); }
  .sheet-handle { width: 38px; height: 4px; margin: 0 auto .7rem; border-radius: 999px; background: #d5d9d6; }
  .sheet-title { display: flex; align-items: center; justify-content: space-between; }
  .sheet-title h2 { margin: .25rem 0 1rem; font-size: 1.05rem; }
  .sheet-title button { width: 38px; height: 38px; border: 0; border-radius: 50%; color: #66716d; background: #f3f4f2; font-size: 1.25rem; cursor: pointer; }
  .sheet form, .sheet form > label { display: grid; gap: .5rem; }
  .sheet form { gap: 1rem; }
  .sheet label, .sheet legend { color: #53605b; font-size: .75rem; font-weight: 700; }
  .sheet input, .sheet textarea, .sheet select, .memo-panel textarea { padding: .8rem; border: 1px solid #d9ddd9; border-radius: 8px; color: #26332f; background: #fff; font: inherit; font-size: .9rem; outline: none; }
  .sheet input:focus, .sheet textarea:focus, .sheet select:focus { border-color: #638076; box-shadow: 0 0 0 3px rgba(99,128,118,.1); }
  .sheet fieldset { display: flex; margin: 0; padding: .75rem; border: 1px solid #e1e4e1; gap: 1rem; }
  .sheet .radio { display: flex; align-items: center; gap: .4rem; }
  .date-fields { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
  .date-fields label { display: grid; gap: .4rem; }
  .date-fields small { color: #929a96; font-size: .65rem; font-weight: 400; }
  .save-button { padding: .85rem; border: 0; border-radius: 999px; color: white; background: #2f6657; font-weight: 750; cursor: pointer; }
  .delete-button { padding: .5rem; border: 0; color: #a14e45; background: transparent; font-size: .75rem; cursor: pointer; }
  @media (max-width: 520px) {
    .planning-intro { gap: .28rem; }
    .planning-intro span { padding: .38rem .4rem; font-size: .61rem; }
    .order-buttons button { width: 29px; }
    .preview-day { grid-template-columns: 56px 1fr; }
    .preview-day li { grid-template-columns: 68px 1fr; }
  }
</style>
