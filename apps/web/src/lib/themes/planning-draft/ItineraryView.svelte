<script lang="ts">
  import { onMount } from "svelte";
  import PlaceSearch from "$lib/planning/PlaceSearch.svelte";
  import type { PlaceResult } from "$lib/planning/search";
  import { getPlace, updatePlace, type Place } from '$lib/planning/places';
  import type { ItineraryResponse, Step, StepType } from "@tabitabi/types";
  import { STEP_TYPE } from "@tabitabi/types";
  import { auth } from "$lib/auth";
  import { authApi } from "$lib/api/auth";
  import { handlePasswordAuth } from "$lib/auth/handle-password-auth";
  import { getIsDemoMode } from "$lib/demo";
  import { getMemoText, updateMemoText } from "$lib/memo";
  import { getAvailablePalettes, getAvailableThemes, getPalette } from "$lib/themes/catalog";
  import {
    getStepSchedule,
    getStepTimeLabel,
    updateStepSchedule,
    type SchedulePrecision,
  } from "$lib/planning/schedule";
  import BottomNav from "../standard/core/components/BottomNav.svelte";
  import MoreMenu from "../standard/core/components/MoreMenu.svelte";
  import SettingsDialog from "../standard/core/components/SettingsDialog.svelte";
  import ItineraryOnboardingPopups from "$lib/features/itinerary-onboarding/ItineraryOnboardingPopups.svelte";
  import PasswordDialog from "../standard/core/components/PasswordDialog.svelte";
  import ShareDialog from "../standard/core/components/ShareDialog.svelte";
  import MoneyOverlay from "$lib/features/money/MoneyOverlay.svelte";
  import PackingOverlay from "$lib/features/packing/PackingOverlay.svelte";
  import { openPrintStudio } from "$lib/print";
  import TypePicker from "../standard/core/components/TypePicker.svelte";
  import "../standard/core/styles/index.css";

  interface Props {
    mapPlanning?: boolean;
    itinerary: ItineraryResponse;
    steps: Step[];
    onUpdateItinerary?: (data: {
      title?: string; theme_id?: string; palette_id?: string; packing_enabled?: boolean;
      prefecture_slugs?: string[]; areas?: string[]; tags?: string[]; metadata_initialized?: boolean;
      memo?: string; secret_settings?: { enabled: boolean; offset_minutes: number } | null;
    }) => Promise<void>;
    onCreateStep?: (data: {
      title: string;
      start_at: number;
      end_at: number;
      location?: string;
      notes?: string;
      link?: string | null;
      type?: StepType;
      is_all_day?: boolean;
    }) => Promise<void>;
    onUpdateStep?: (stepId: string, data: {
      title?: string;
      start_at?: number;
      end_at?: number;
      location?: string | null;
      notes?: string;
      link?: string | null;
      type?: StepType;
      is_all_day?: boolean;
    }) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
    onBatchUpdateDates?: (updates: import("@tabitabi/types").BatchStepDateUpdate[]) => Promise<void>;
  }

  let { itinerary, steps, onUpdateItinerary, onCreateStep, onUpdateStep, onDeleteStep, onBatchUpdateDates, mapPlanning = false }: Props = $props();
  let placeDraft = $state<Place | null>(null);
  let formError = $state('');
  let descriptionEditing = $state(false);
  function selectPlace(place: PlaceResult) {
    placeDraft = { lat:place.lat, lng:place.lng, priority:placeDraft?.priority };
    if (!form.title.trim() || !editingStep) form.title = place.name;
    form.location = `${place.name} ${place.address}`;
  }

  function focusSheet(node: HTMLElement) {
    const previous = document.activeElement as HTMLElement | null;
    node.querySelector<HTMLInputElement>('input')?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) { sheetOpen = false; event.preventDefault(); }
      if (event.key !== 'Tab') return;
      const items = Array.from(node.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]'));
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { last?.focus(); event.preventDefault(); }
      else if (!event.shiftKey && document.activeElement === last) { first?.focus(); event.preventDefault(); }
    };
    node.addEventListener('keydown', keydown);
    return { destroy() { node.removeEventListener('keydown', keydown); previous?.focus(); } };
  }

  type ScreenMode = "plan" | "preview";
  type WhenChoice = "undecided" | "day";

  let screenMode = $state<ScreenMode>("plan");
  let hasEditPermission = $state(false);
  let editingTitle = $state(false);
  let titleDraft = $state("");
  let sheetOpen = $state(false);
  let editingStep = $state<Step | null>(null);
  let saving = $state(false);
  let batchDayOpen = $state(false);
  let dayDateDrafts = $state<Record<number, string>>({});
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
  let showSettingsDialog = $state(false);
  let showMetadataDialog = $state(false);
  let selectedPaletteId = $state(itinerary.palette_id ?? "neutral");
  let secretModeEnabled = $state(itinerary.secret_settings?.enabled ?? false);
  let secretModeOffset = $state(itinerary.secret_settings?.offset_minutes ?? 60);
  let packingEnabled = $state(itinerary.packing_enabled ?? true);
  let prefectureSlugs = $state([...(itinerary.prefecture_slugs ?? [])]);
  let itineraryAreas = $state([...(itinerary.areas ?? [])]);
  let itineraryTags = $state([...(itinerary.tags ?? [])]);

  const isSharedSnapshot = $derived(!!itinerary.source_itinerary_id);

  let form = $state({
    title: "",
    note: "",
    when: "undecided" as WhenChoice,
    day: 1,
    time: "",
    endTime: "",
    location: "",
    link: "",
    type: STEP_TYPE.NORMAL_GENERAL as StepType,
  });

  const previewPin = $derived<Step[]>(placeDraft ? [{ id:'preview-pin', itinerary_id:itinerary.id, title:form.title || '選んだ場所', location:form.location, notes:updatePlace(undefined, placeDraft), start_at:0, end_at:0, created_at:'', updated_at:'' }] : []);

  const otherThemes = $derived(getAvailableThemes().filter((theme) => theme.id !== itinerary.theme_id));
  const palettes = getAvailablePalettes();
  const paletteStyle = $derived(Object.entries(getPalette(selectedPaletteId).colors).map(([name, value]) => `${name}:${value}`).join(";"));

  onMount(() => {
    const openFeatureFromHash = () => {
      showMoney = window.location.hash === '#money';
      showPacking = window.location.hash === '#packing';
    };
    openFeatureFromHash();
    window.addEventListener('hashchange', openFeatureFromHash);
    titleDraft = itinerary.title;
    memoDraft = getMemoText(itinerary.memo);
    if (getIsDemoMode() || isSharedSnapshot) {
      hasEditPermission = true;
      return () => window.removeEventListener('hashchange', openFeatureFromHash);
    }
    const token = auth.extractTokenFromUrl();
    if (token && itinerary.is_password_protected) auth.setToken(itinerary.id, itinerary.title, token);
    hasEditPermission = !isSharedSnapshot && auth.hasEditPermission(itinerary.id);
    if (!hasEditPermission && !itinerary.is_password_protected && !isSharedSnapshot) hasEditPermission = true;
    if (hasEditPermission) auth.updateAccessTime(itinerary.id, itinerary.title);
    return () => window.removeEventListener('hashchange', openFeatureFromHash);
  });

  function closeFeature(feature: 'money' | 'packing') {
    if (window.location.hash === `#${feature}`) window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
    if (feature === 'money') showMoney = false;
    else showPacking = false;
  }

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

  function openCreate(place?: Place) {
    if (!hasEditPermission) return;
    placeDraft = place ?? null;
    formError = '';
    editingStep = null;
    form = { title: "", note: "", when: "undecided", day: 1, time: "", endTime: "", location: "", link: "", type: STEP_TYPE.NORMAL_GENERAL as StepType };
    sheetOpen = true;
  }

  function openEdit(step: Step) {
    if (!hasEditPermission) return;
    placeDraft = getPlace(step.notes);
    formError = '';
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
      endTime: schedule.precision === "time"
        ? `${String(new Date(step.end_at).getHours()).padStart(2, "0")}:${String(new Date(step.end_at).getMinutes()).padStart(2, "0")}`
        : "",
      location: step.location ?? "",
      link: step.link ?? "",
      type: step.type ?? STEP_TYPE.NORMAL_GENERAL,
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
    if (!hasEditPermission || !form.title.trim() || saving) return;
    formError = '';
    saving = true;
    try {
      const schedule = scheduleFromForm();
      const startAt = schedule.precision === "undecided"
        ? timestampFor(1, "12:00")
        : timestampFor(schedule.day ?? 1, form.time || "12:00");
      const endAt = schedule.precision === "time" && form.endTime
        ? timestampFor(schedule.day ?? 1, form.endTime)
        : startAt + 60 * 60 * 1000;
      if (endAt <= startAt) {
        alert("終了時刻は開始時刻より後に設定してください");
        return;
      }
      let notes = updateStepSchedule(
        updateMemoText(editingStep?.notes, form.note),
        schedule,
      );
      if (mapPlanning) notes = updatePlace(notes, placeDraft);
      const data = {
        title: form.title.trim(),
        start_at: startAt,
        end_at: endAt,
        notes,
        type: form.type,
        is_all_day: false,
      };
      const location = form.location.trim();
      const link = form.link.trim();
      if (editingStep && onUpdateStep) {
        await onUpdateStep(editingStep.id, { ...data, location: location || null, link: link || null });
      } else if (onCreateStep) {
        await onCreateStep({ ...data, ...(location && { location }), ...(link && { link }) });
      }
      sheetOpen = false;
      editingStep = null;
    } catch {
      formError = '保存できませんでした。入力内容は残っています。もう一度お試しください。';
    } finally {
      saving = false;
    }
  }

  async function deleteStep() {
    if (!hasEditPermission || saving || !editingStep || !onDeleteStep || !confirm(`「${editingStep.title}」を削除しますか？`)) return;
    saving = true;
    try {
      await onDeleteStep(editingStep.id);
      sheetOpen = false;
      editingStep = null;
    } catch { formError = '削除できませんでした。もう一度お試しください。'; }
    finally { saving = false; }
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

  async function moveDay(group: { steps: Step[] }, value: string) {
    if (!value || !onBatchUpdateDates || saving) return;
    saving = true;
    try {
      const updates = group.steps.map((step) => {
        const start = new Date(step.start_at);
        const target = new Date(`${value}T00:00:00`);
        target.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
        const duration = step.end_at - step.start_at;
        return { id: step.id, start_at: target.getTime(), end_at: target.getTime() + duration };
      });
      await onBatchUpdateDates(updates);
    } finally { saving = false; }
  }

  function openBatchDayEditor() {
    dayDateDrafts = Object.fromEntries(dayGroups.map((group) => [group.day, localDateKey(group.steps[0].start_at)]));
    batchDayOpen = true;
  }

  async function applyBatchDayChanges() {
    if (!onBatchUpdateDates || saving) return;
    const updates = dayGroups.flatMap((group) => {
      const value = dayDateDrafts[group.day];
      if (!value || value === localDateKey(group.steps[0].start_at)) return [];
      return group.steps.map((step) => {
        const start = new Date(step.start_at);
        const target = new Date(`${value}T00:00:00`);
        target.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
        const duration = step.end_at - step.start_at;
        return { id: step.id, start_at: target.getTime(), end_at: target.getTime() + duration };
      });
    });
    if (!updates.length) return;
    saving = true;
    try { await onBatchUpdateDates(updates); batchDayOpen = false; } finally { saving = false; }
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
    descriptionEditing = false;
  }

  async function switchTheme(themeId: string) {
    if (onUpdateItinerary) await onUpdateItinerary({ theme_id: themeId });
  }

  async function saveMetadata(metadata: { prefectureSlugs: string[]; areas: string[]; tags: string[] }) {
    prefectureSlugs = metadata.prefectureSlugs;
    itineraryAreas = metadata.areas;
    itineraryTags = metadata.tags;
    await onUpdateItinerary?.({ prefecture_slugs: metadata.prefectureSlugs, areas: metadata.areas, tags: metadata.tags, metadata_initialized: true });
    showMetadataDialog = false;
  }

  async function handlePaletteChange(paletteId: string) {
    selectedPaletteId = paletteId;
    await onUpdateItinerary?.({ palette_id: paletteId });
  }

  async function handleSecretModeChange(enabled: boolean, offset: number) {
    secretModeEnabled = enabled;
    secretModeOffset = offset;
    await onUpdateItinerary?.({ secret_settings: { enabled, offset_minutes: offset } });
  }

  async function handlePackingEnabledChange(enabled: boolean) {
    packingEnabled = enabled;
    if (!enabled) showPacking = false;
    await onUpdateItinerary?.({ packing_enabled: enabled });
  }
</script>

<svelte:head><meta name="theme-color" content="#faf9f5" /></svelte:head>

<div class="draft-theme" style={paletteStyle} class:map-planning={mapPlanning}>
  {#if showCopyMessage}<div class="copy-message">コピーしました</div>{/if}
  <header class="draft-header">
    <a class="brand" href="/">たびたび</a>
    {#if editingTitle}
      <input class="title-input" bind:value={titleDraft} onblur={saveTitle} onkeydown={(event) => event.key === "Enter" && saveTitle()} />
    {:else}
      <button class="title-button" onclick={() => hasEditPermission && (editingTitle = true)} disabled={!hasEditPermission}>{itinerary.title}</button>
    {/if}
    <p>{mapPlanning ? '地図を見ながら、行きたい場所と日程をまとめる' : 'まだ決まっていなくても、ここから。'}</p>
    {#if mapPlanning}
      <section class="trip-description" aria-label="旅のメモ">
        <div class="description-heading"><strong>旅のメモ</strong>{#if hasEditPermission && !descriptionEditing}<button onclick={() => descriptionEditing = true}>編集</button>{/if}</div>
        {#if descriptionEditing}
          <textarea aria-label="旅のメモ" bind:value={memoDraft} rows="5"></textarea>
          <div class="description-actions"><button class="cancel" onclick={() => { memoDraft = getMemoText(itinerary.memo); descriptionEditing = false; }}>キャンセル</button><button onclick={saveMemo}>保存</button></div>
        {:else}
          <p class="description-copy">{getMemoText(itinerary.memo) || '旅の目的や、忘れたくないことをメモできます。'}</p>
        {/if}
      </section>
    {/if}
  </header>

  <nav class="mode-tabs" aria-label="表示切り替え">
    <button class:active={screenMode === "plan"} onclick={() => (screenMode = "plan")}>{mapPlanning ? '地図' : '予定を決める'}</button>
    <button class:active={screenMode === "preview"} onclick={() => (screenMode = "preview")}>日程</button>
  </nav>

  <main>
    {#if screenMode === "plan" && mapPlanning}
      {#await import('../planning-map/PlanningBoard.svelte')}
        <p role="status">地図を読み込んでいます…</p>
      {:then module}
        <module.default {steps} canEdit={hasEditPermission} onCreate={openCreate} onEdit={openEdit} onPreview={() => screenMode = 'preview'} />
      {:catch}
        <p role="alert">地図画面を読み込めませんでした。再読み込みするか、旅程を見る画面をご利用ください。</p>
      {/await}
    {:else if screenMode === "plan"}
      <section class="planning-intro">
        <span>候補を作る</span><i>→</i><span>日を決める</span><i>→</i><span>時間を決める</span>
      </section>

      {#if hasEditPermission}<button class="add-button" onclick={() => openCreate()}>＋ 予定を追加</button>{/if}

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

      {#if hasEditPermission}<button class="add-button" onclick={() => openCreate()}>＋ 予定を追加</button>{/if}
      <button class="memo-button" onclick={() => (memoOpen = !memoOpen)}>旅のメモ {memoOpen ? "−" : "+"}</button>
      {#if memoOpen}
        <div class="memo-panel"><textarea bind:value={memoDraft} rows="6" placeholder={'例:\n□ 新幹線を予約\n□ ホテルを予約'} disabled={!hasEditPermission}></textarea>{#if hasEditPermission}<button onclick={saveMemo}>保存</button>{/if}</div>
      {/if}
    {:else}
      <div class="preview-heading"><p>旅程プレビュー</p><h2>{itinerary.title}</h2></div>
      {#if undecidedSteps.length > 0}
        <section class="preview-unscheduled"><strong>まだ決めていない予定</strong><span>{undecidedSteps.length}件</span>{#each undecidedSteps as step}<p>{step.title} {#if mapPlanning && hasEditPermission}<button onclick={() => openEdit(step)}>行く日を決める →</button>{/if}</p>{/each}</section>
      {/if}
      <div class="preview-days">
        {#each dayGroups.filter((group) => group.steps.length > 0) as group}
          <section class="preview-day"><header><span>Day</span><strong>{group.day}</strong></header><ol>{#each group.steps as step, index}<li><time class:pending={getStepSchedule(step).precision !== "time"}>{getStepTimeLabel(step)}</time><div><strong>{step.title}</strong>{#if getMemoText(step.notes)}<small>{getMemoText(step.notes)}</small>{/if}{#if mapPlanning && hasEditPermission}<div class="preview-controls"><button onclick={() => openEdit(step)}>編集</button><button disabled={index === 0 || saving} onclick={() => moveStep(step, -1, group.steps)} aria-label={`${step.title}を上へ`}>↑</button><button disabled={index === group.steps.length - 1 || saving} onclick={() => moveStep(step, 1, group.steps)} aria-label={`${step.title}を下へ`}>↓</button></div>{/if}</div></li>{/each}</ol></section>
        {/each}
      </div>
      {#if steps.length === 0}<div class="empty"><strong>旅程はまだ空です。</strong><p>「考える」から候補を追加しましょう。</p></div>{/if}

      {#if hasEditPermission && dayGroups.length}<button class="batch-day-button" onclick={openBatchDayEditor}>日程をまとめて変更</button>{/if}
      <aside class:complete={isComplete} class="theme-guide">
        <p>{isComplete ? "予定が整いました。" : "予定が固まってきたら、"}</p>
        <strong>見るためのテーマに着替えてみませんか？</strong>
        {#if hasEditPermission}<button onclick={() => (themeChoicesOpen = !themeChoicesOpen)}>ほかのテーマを試す</button>{/if}
        {#if themeChoicesOpen}
          <div class="theme-choices">{#each otherThemes as theme}<button onclick={() => switchTheme(theme.id)}><strong>{theme.name}</strong><small>{theme.description}</small></button>{/each}</div>
        {/if}
      </aside>
    {/if}
  </main>

  {#if sheetOpen}
    <div class="sheet-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (sheetOpen = false)}>
      <div class="sheet" use:focusSheet role="dialog" aria-modal="true" aria-label={editingStep ? "予定を編集" : "予定を追加"}>
        <div class="sheet-handle"></div><div class="sheet-title"><h2>{editingStep ? "予定を編集" : "予定を追加"}</h2><button onclick={() => (sheetOpen = false)} aria-label="閉じる">×</button></div>
        <form onsubmit={saveStep}>
          {#if formError}<p role="alert">{formError}</p>{/if}
          <div class="location-field"><span>場所 <small>任意</small></span><PlaceSearch bind:value={form.location} onSelect={selectPlace} /></div>
          {#if mapPlanning}
            {#if placeDraft}
              <div class="pin-fields"><strong>✓ 場所を選択済み</strong><p>{form.location || '地図で選んだ場所'} · ピンの位置を確かめてください。</p>
                {#await import('../planning-map/PlaceMap.svelte') then module}
                  {#key `${placeDraft.lat},${placeDraft.lng}`}
                    <div class="pin-preview"><module.default steps={previewPin} numbers={{'preview-pin':1}} selected="preview-pin" canEdit={true} onSelect={() => {}} onPin={(place) => placeDraft = { ...place, priority:placeDraft?.priority }} /></div>
                  {/key}
                {/await}
                <label class="radio"><input type="checkbox" bind:checked={placeDraft.priority} />★ 絶対行きたい</label><button type="button" onclick={() => { placeDraft = null; form.location = ''; }}>場所を外してあとで決める</button>
              </div>
            {:else}<p class="place-help">まだ場所が決まらないときは、下のタイトルだけで候補を保存できます。</p>{/if}
          {/if}
          <label>タイトル<input bind:value={form.title} placeholder="清水寺に行きたい" required /></label>
          <label>メモ<textarea bind:value={form.note} rows="3" placeholder="朝の方が空いてそう"></textarea></label>
          <div class="type-picker"><span>予定のアイコン</span><TypePicker value={form.type} onSelect={(type: StepType) => form.type = type} /></div>
          <label>リンク <small>任意</small><input type="url" bind:value={form.link} placeholder="https://..." /></label>
          <fieldset><legend>いつ？</legend><label class="radio"><input type="radio" bind:group={form.when} value="undecided" />まだ決めない</label><label class="radio"><input type="radio" bind:group={form.when} value="day" />日を決める</label></fieldset>
          {#if form.when === "day"}
            <div class="date-fields"><label>日<select bind:value={form.day}>{#each Array.from({ length: dayCount + 1 }, (_, index) => index + 1) as day}<option value={day}>Day {day}</option>{/each}</select></label><div class="time-fields"><label>開始時刻 <small>任意</small><input type="time" bind:value={form.time} /></label>{#if form.time}<label>終了時刻 <small>任意</small><input type="time" bind:value={form.endTime} /></label>{/if}</div></div>
          {/if}
          <button class="save-button" type="submit" disabled={saving}>{saving ? "保存中…" : editingStep ? "保存" : "追加"}</button>
          {#if editingStep}<button class="delete-button" type="button" onclick={deleteStep}>この予定を削除</button>{/if}
        </form>
      </div>
    </div>
  {/if}

  {#if batchDayOpen}<div class="batch-day-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (batchDayOpen = false)}><section class="batch-day-modal" role="dialog" aria-modal="true" aria-label="日程をまとめて変更"><header><div><strong>日程をまとめて変更</strong><small>時刻と所要時間はそのままです</small></div><button onclick={() => batchDayOpen = false} aria-label="閉じる">×</button></header>{#each dayGroups as group}<label><span>Day {group.day}<small>{group.steps.length}件の予定</small></span><input type="date" bind:value={dayDateDrafts[group.day]} /></label>{/each}<footer><button class="cancel" onclick={() => batchDayOpen = false}>キャンセル</button><button onclick={() => void applyBatchDayChanges()} disabled={saving}>{saving ? '変更中…' : '変更する'}</button></footer></section></div>{/if}

  <BottomNav
    onMoneyOpen={() => (showMoney = true)}
    onPackingOpen={() => (showPacking = true)}
    onMenuClick={() => (showMoreMenu = true)}
  />

  <MoneyOverlay
    show={showMoney}
    itineraryId={itinerary.id}
    canEdit={hasEditPermission && !isSharedSnapshot}
    {steps}
    onClose={() => closeFeature('money')}
  />

  <PackingOverlay
    show={showPacking}
    itineraryId={itinerary.id}
    canEdit={hasEditPermission && !isSharedSnapshot}
    onClose={() => closeFeature('packing')}
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
    canConfigure={hasEditPermission}
    canRequestEdit={!isSharedSnapshot}
    {hasEditPermission}
    onShare={() => {
      if (hasEditPermission) showShareDialog = true;
      else void copyShareLink(false);
    }}
    onPrint={openPrintStudio}
    onSettings={() => (showSettingsDialog = true)}
    onEditModeToggle={handleEditModeToggle}
    onClose={() => (showMoreMenu = false)}
  />

  <SettingsDialog
    show={showSettingsDialog}
    itineraryId={itinerary.id}
    themes={getAvailableThemes()}
    {palettes}
    selectedThemeId={itinerary.theme_id}
    {selectedPaletteId}
    {secretModeEnabled}
    {secretModeOffset}
    {packingEnabled}
    onThemeChange={switchTheme}
    onPaletteChange={handlePaletteChange}
    onSecretModeChange={handleSecretModeChange}
    onPackingEnabledChange={handlePackingEnabledChange}
    onEditMetadata={() => (showMetadataDialog = true)}
    onClose={() => (showSettingsDialog = false)}
  />

  <ItineraryOnboardingPopups
    showMetadata={showMetadataDialog}
    {prefectureSlugs}
    areas={itineraryAreas}
    tags={itineraryTags}
    onSaveMetadata={saveMetadata}
    onCloseMetadata={() => (showMetadataDialog = false)}
  />
</div>

<style>
  .trip-description { max-width:760px; margin-top:20px; padding:16px 18px; border:1px solid #dfe4dc; border-radius:12px; background:#fff; font-size:12px; }
  .description-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }
  .description-heading strong { color:#42514a; font-size:11px; }
  .description-copy { margin-top:9px !important; color:#394740 !important; white-space:pre-line; overflow-wrap:anywhere; line-height:1.85 !important; }
  .trip-description textarea { width:100%; margin:12px 0 8px; padding:11px; border:1px solid #cfd8c9; border-radius:8px; font:inherit; line-height:1.7; resize:vertical; }
  .trip-description button { padding:7px 11px; border:0; border-radius:8px; color:white; background:#35695d; font-size:11px; cursor:pointer; }
  .description-actions { display:flex; justify-content:flex-end; gap:7px; }
  .trip-description .cancel { color:#5f6a64; background:#eef0ed; }
  .pin-preview { height:260px; margin:12px 0; }
  .pin-preview :global(.map-frame) { min-height:260px; }
  .place-help { color:#78837c; font-size:12px; line-height:1.7; }

  .draft-theme :global(*) { box-sizing: border-box; }
  .map-planning .draft-header, .map-planning main { width:min(1240px, calc(100% - 48px)); }
  .map-planning .draft-header { padding-top:24px; }
  .map-planning .brand { margin-bottom:18px; }
  .map-planning .title-button { font-size:24px; }
  .map-planning .mode-tabs { width:min(1240px, calc(100% - 16px)); }
  .map-planning .preview-days,.map-planning .preview-unscheduled,.map-planning .theme-guide { max-width:760px; margin-left:auto; margin-right:auto; }
  .preview-controls { display:flex !important; gap:8px; }
  .preview-controls button,.preview-unscheduled button { padding:6px 10px; border:1px solid #d9ddd9; border-radius:7px; background:#f4f6ef; color:#35695d; font-size:12px; cursor:pointer; }
  .pin-fields { padding:14px; background:#f4f6ef; border-radius:10px; font-size:12px; }
  .pin-fields p { font-size:11px; color:#78837c; }
  .pin-fields input { width:100%; }
  .pin-fields .radio input { width:auto; }
  @media(max-width:700px) { .map-planning .draft-header,.map-planning main { width:calc(100% - 28px); } }
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
  .batch-day-button { display:block; width:100%; margin:2rem 0 0; padding:.75rem 1rem; border:1px solid #cfd5d1; border-radius:10px; color:#2f6657; background:#fff; font-size:.8rem; font-weight:750; cursor:pointer; }
  .batch-day-backdrop { position:fixed; z-index:1000; inset:0; display:grid; padding:16px; place-items:center; background:rgba(24,35,31,.36); backdrop-filter:blur(2px); }
  .batch-day-modal { width:min(480px,100%); max-height:calc(100dvh - 32px); overflow:auto; padding:1rem; border-radius:16px; background:#fff; box-shadow:0 16px 48px rgba(0,0,0,.2); }
  .batch-day-modal header,.batch-day-modal footer,.batch-day-modal label { display:flex; align-items:center; }
  .batch-day-modal header { justify-content:space-between; margin-bottom:.7rem; }.batch-day-modal header small,.batch-day-modal label small { display:block; margin-top:.15rem; color:#89928d; font-size:.68rem; }.batch-day-modal header > button { width:30px; height:30px; border:0; border-radius:50%; background:#eef0ed; font-size:1.1rem; cursor:pointer; }
  .batch-day-modal label { justify-content:space-between; padding:.65rem 0; border-top:1px solid #e5e6e3; color:#53605b; font-size:.8rem; font-weight:700; }.batch-day-modal input { width:9.5rem; padding:.5rem; font-size:.8rem; }.batch-day-modal footer { justify-content:flex-end; margin-top:.8rem; gap:.5rem; }.batch-day-modal footer button { padding:.6rem .8rem; border:0; border-radius:8px; color:#fff; background:#2f6657; font-size:.75rem; font-weight:700; cursor:pointer; }.batch-day-modal footer button.cancel { color:#66716d; background:#eef0ed; }
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
  .sheet-backdrop { position: fixed; z-index: 300; inset: 0; display: flex; align-items: end; justify-content: center; background: rgba(24,35,31,.34); }
  .sheet { width: min(600px, 100%); max-height: 92dvh; overflow: auto; padding: .6rem 1.2rem calc(1.2rem + env(safe-area-inset-bottom)); border-radius: 20px 20px 0 0; background: #fff; box-shadow: 0 -12px 40px rgba(0,0,0,.12); }
  .sheet-handle { width: 38px; height: 4px; margin: 0 auto .7rem; border-radius: 999px; background: #d5d9d6; }
  .sheet-title { display: flex; align-items: center; justify-content: space-between; }
  .sheet-title h2 { margin: .25rem 0 1rem; font-size: 1.05rem; }
  .sheet-title button { width: 38px; height: 38px; border: 0; border-radius: 50%; color: #66716d; background: #f3f4f2; font-size: 1.25rem; cursor: pointer; }
  .sheet form, .sheet form > label { display: grid; gap: .5rem; }
  .location-field { display:grid; gap:.5rem; color:#53605b; font-size:.75rem; font-weight:700; }
  .sheet form { gap: 1rem; }
  .sheet label, .sheet legend { color: #53605b; font-size: .75rem; font-weight: 700; }
  .sheet input, .sheet textarea, .sheet select, .memo-panel textarea { padding: .8rem; border: 1px solid #d9ddd9; border-radius: 8px; color: #26332f; background: #fff; font: inherit; font-size: .9rem; outline: none; }
  .sheet input:focus, .sheet textarea:focus, .sheet select:focus { border-color: #638076; box-shadow: 0 0 0 3px rgba(99,128,118,.1); }
  .sheet fieldset { display: flex; margin: 0; padding: .75rem; border: 1px solid #e1e4e1; gap: 1rem; }
  .sheet .radio { display: flex; align-items: center; gap: .4rem; }
  .date-fields { display: grid; grid-template-columns: 1fr 2fr; gap: .8rem; }
  .time-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; }
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
    .date-fields { grid-template-columns: 1fr; }
  }
</style>
