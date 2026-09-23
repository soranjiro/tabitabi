<script lang="ts">
  import { onMount } from "svelte";
  import PlaceSearch from "$lib/planning/PlaceSearch.svelte";
  import type { PlaceResult } from "$lib/planning/search";
  import { getPlace, placeFields, type Place } from '$lib/planning/places';
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
  } from "$lib/planning/schedule";
  import { nextLocalDate, planningDateRange, type PlanningWhen } from "$lib/planning/datetime";
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
  import PlaceMap from "../planning-map/PlaceMap.svelte";
  import StepDetail from "./StepDetail.svelte";
  import PlaceEditor from "./PlaceEditor.svelte";
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
      start_at: number | null;
      end_at: number | null;
      location?: string;
      notes?: string;
      link?: string | null;
      type?: StepType;
      is_all_day?: boolean;
      time_unspecified?: boolean;
      pin_latitude?: number | null; pin_longitude?: number | null; is_priority?: boolean; sort_order?: number | null;
    }) => Promise<void>;
    onUpdateStep?: (stepId: string, data: {
      title?: string;
      start_at?: number | null;
      end_at?: number | null;
      location?: string | null;
      notes?: string;
      link?: string | null;
      type?: StepType;
      is_all_day?: boolean;
      time_unspecified?: boolean;
      pin_latitude?: number | null; pin_longitude?: number | null; is_priority?: boolean; sort_order?: number | null;
    }) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
    onBatchUpdateDates?: (updates: import("@tabitabi/types").BatchStepDateUpdate[]) => Promise<void>;
  }

  let { itinerary, steps, onUpdateItinerary, onCreateStep, onUpdateStep, onDeleteStep, onBatchUpdateDates, mapPlanning = false }: Props = $props();
  let placeDraft = $state<Place | null>(null);
  let formError = $state('');
  let descriptionEditing = $state(false);
  function selectPlace(place: PlaceResult) {
    placeDraft = { lat:place.lat, lng:place.lng, priority:form.isPriority };
    if (!form.title.trim()) form.title = place.name;
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

  type ScreenMode = "plan" | "map" | "schedule";
  type WhenChoice = PlanningWhen;

  let screenMode = $state<ScreenMode>(mapPlanning ? "map" : "plan");
  let selectedStepId = $state<string | null>(null);
  let detailOpen = $state(false);
  let placeEditing = $state(false);
  let mapPinEditing = $state(false);
  let extraFieldsOpen = $state(false);
  let endDateTouched = $state(false);
  let searchQuery = $state("");
  let hasEditPermission = $state(false);
  let editingTitle = $state(false);
  let titleDraft = $state("");
  let sheetOpen = $state(false);
  let editingStep = $state<Step | null>(null);
  let saving = $state(false);
  let batchDayOpen = $state(false);
  let dayDateDrafts = $state<Record<number, string>>({});
  let memoOpen = $state(false);
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
    date: "",
    time: "",
    endDate: "",
    endTime: "",
    location: "",
    link: "",
    type: STEP_TYPE.NORMAL_GENERAL as StepType,
    isPriority: false,
  });

  const previewPin = $derived<Step[]>(placeDraft ? [{ id:'preview-pin', itinerary_id:itinerary.id, title:form.title || '選んだ場所', location:form.location, notes:'', start_at:null, end_at:null, time_unspecified:false, ...placeFields(placeDraft), sort_order:null, created_at:'', updated_at:'' }] : []);
  const selectedStep = $derived(steps.find((step) => step.id === selectedStepId) ?? null);
  const mapNumbers = $derived(Object.fromEntries(steps.map((step, index) => [step.id, index + 1])));
  const filteredSteps = $derived(steps.filter((step) => `${step.title} ${step.location ?? ''}`.toLowerCase().includes(searchQuery.toLowerCase())));

  const otherThemes = $derived(getAvailableThemes().filter((theme) => theme.id !== itinerary.theme_id && !(mapPlanning && theme.id === 'planning-draft')));
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
      .filter((step) => step.start_at !== null)
      .map((step) => localDateKey(step.start_at!)),
  )].sort());

  function dayForStep(step: Step): number | null {
    const schedule = getStepSchedule(step);
    if (schedule.precision === "undecided") return null;
    const index = legacyDates.indexOf(localDateKey(step.start_at!));
    return index >= 0 ? index + 1 : 1;
  }

  const dayCount = $derived.by(() => Math.max(
    0,
    legacyDates.length,
    ...steps.map((step) => dayForStep(step) ?? 0),
  ));

  function stepOrder(step: Step): number {
    return getStepSchedule(step).order ?? step.start_at ?? 0;
  }

  const undecidedSteps = $derived.by(() => steps
    .filter((step) => getStepSchedule(step).precision === "undecided")
    .sort((a, b) => stepOrder(a) - stepOrder(b)));

  const dayGroups = $derived.by(() => Array.from({ length: dayCount }, (_, index) => ({
    day: index + 1,
    date: legacyDates[index],
    steps: steps
      .filter((step) => dayForStep(step) === index + 1)
      .sort((a, b) => {
        const aSchedule = getStepSchedule(a);
        const bSchedule = getStepSchedule(b);
        if (aSchedule.precision === "time" && bSchedule.precision === "time") return a.start_at! - b.start_at!;
        return stepOrder(a) - stepOrder(b);
      }),
  })).filter((group) => group.steps.length > 0));

  const isComplete = $derived(steps.length > 0 && steps.every((step) => getStepSchedule(step).precision === "time"));

  function timeFor(value: number | null): string {
    if (value === null) return "";
    const date = new Date(value);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function dateTimeLabel(step: Step): string {
    const precision = getStepSchedule(step).precision;
    if (precision === "undecided") return "未定";
    const start = new Date(step.start_at!);
    const startDate = start.toLocaleDateString("ja-JP");
    if (precision === "day") return `${startDate} · 日付決定（時刻未定）`;
    const end = step.end_at === null ? null : new Date(step.end_at);
    const endLabel = end ? `${localDateKey(end.getTime()) !== localDateKey(step.start_at!) ? `${end.toLocaleDateString("ja-JP")} ` : ""}${timeFor(step.end_at)}` : "";
    return `${startDate} ${timeFor(step.start_at)}${endLabel ? ` 〜 ${endLabel}` : ""}`;
  }

  function stepIcon(type: Step['type']): string {
    if (type?.includes('food') || type?.includes('meal')) return '🍽';
    if (type?.includes('hotel')) return '🛏';
    if (type?.includes('sightseeing')) return '📍';
    if (type?.includes('train')) return '🚆';
    if (type?.includes('bus')) return '🚌';
    if (type?.includes('plane')) return '✈';
    if (type?.includes('car')) return '🚗';
    if (type?.includes('shopping')) return '🛍';
    return '📝';
  }

  function openDetail(step: Step) { selectedStepId = step.id; detailOpen = true; }

  function openPlaceEditor(step: Step) {
    selectedStepId = step.id;
    detailOpen = false;
    placeEditing = true;
  }

  async function savePlace(place: Place) {
    if (!selectedStep || !onUpdateStep) return;
    await onUpdateStep(selectedStep.id, placeFields(place));
    placeEditing = false;
  }

  async function removePin() {
    if (!selectedStep || !onUpdateStep) return;
    await onUpdateStep(selectedStep.id, { pin_latitude: null, pin_longitude: null });
    placeEditing = false;
  }

  async function removeSelectedStep() {
    if (!selectedStep || !hasEditPermission || !onDeleteStep || !confirm(`「${selectedStep.title}」を削除しますか？`)) return;
    await onDeleteStep(selectedStep.id);
    selectedStepId = null;
    detailOpen = false;
  }

  function openCreate(place?: Place) {
    if (!hasEditPermission) return;
    placeDraft = place ?? null;
    formError = '';
    editingStep = null;
    form = { title: "", note: "", when: "undecided", date: legacyDates.at(-1) ?? localDateKey(Date.now()), time: "09:00", endDate: legacyDates.at(-1) ?? localDateKey(Date.now()), endTime: "10:00", location: "", link: "", type: STEP_TYPE.NORMAL_GENERAL as StepType, isPriority: false };
    endDateTouched = false;
    extraFieldsOpen = false;
    sheetOpen = true;
  }

  function openEdit(step: Step) {
    if (!hasEditPermission) return;
    placeDraft = getPlace(step);
    formError = '';
    const schedule = getStepSchedule(step);
    const time = schedule.precision === "time"
      ? `${String(new Date(step.start_at!).getHours()).padStart(2, "0")}:${String(new Date(step.start_at!).getMinutes()).padStart(2, "0")}`
      : "";
    editingStep = step;
    form = {
      title: step.title,
      note: getMemoText(step.notes),
      when: schedule.precision === "undecided" ? "undecided" : schedule.precision === "day" ? "day" : "time",
      date: step.start_at === null ? (legacyDates.at(-1) ?? localDateKey(Date.now())) : localDateKey(step.start_at),
      time: time || "09:00",
      endDate: step.end_at === null ? (legacyDates.at(-1) ?? localDateKey(Date.now())) : localDateKey(step.end_at),
      endTime: schedule.precision === "time"
        ? timeFor(step.end_at) : "10:00",
      location: step.location ?? "",
      link: step.link ?? "",
      type: step.type ?? STEP_TYPE.NORMAL_GENERAL,
      isPriority: !!step.is_priority,
    };
    endDateTouched = form.endDate !== form.date;
    extraFieldsOpen = !!(form.note || form.link || placeDraft?.priority);
    sheetOpen = true;
  }

  async function saveStep(event: SubmitEvent) {
    event.preventDefault();
    if (!hasEditPermission || !form.title.trim() || saving) return;
    formError = '';
    saving = true;
    try {
      let range: ReturnType<typeof planningDateRange>;
      try { range = planningDateRange(form); }
      catch (error) { formError = error instanceof Error ? error.message : '日時を確認してください。'; return; }
      const data = {
        title: form.title.trim(),
        start_at: range.start_at,
        end_at: range.end_at,
        notes: updateMemoText(editingStep?.notes, form.note),
        type: form.type,
        is_all_day: false,
        time_unspecified: range.time_unspecified,
        sort_order: editingStep?.sort_order ?? Date.now(),
        ...placeFields(placeDraft),
        is_priority: form.isPriority,
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
      selectedStepId = null;
      detailOpen = false;
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
    const currentOrder = step.sort_order ?? currentIndex;
    const targetOrder = target.sort_order ?? currentIndex + direction;
    await onUpdateStep(step.id, { sort_order: targetOrder });
    await onUpdateStep(target.id, { sort_order: currentOrder });
  }

  async function moveDay(group: { steps: Step[] }, value: string) {
    if (!value || !onBatchUpdateDates || saving) return;
    saving = true;
    try {
      const updates = group.steps.map((step) => {
        const start = new Date(step.start_at!);
        const target = new Date(`${value}T00:00:00`);
        target.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
        const duration = step.end_at! - step.start_at!;
        return { id: step.id, start_at: target.getTime(), end_at: target.getTime() + duration };
      });
      await onBatchUpdateDates(updates);
    } finally { saving = false; }
  }

  function openBatchDayEditor() {
    dayDateDrafts = Object.fromEntries(dayGroups.map((group) => [group.day, localDateKey(group.steps[0].start_at!)]));
    batchDayOpen = true;
  }

  async function applyBatchDayChanges() {
    if (!onBatchUpdateDates || saving) return;
    const updates = dayGroups.flatMap((group) => {
      const value = dayDateDrafts[group.day];
      if (!value || value === localDateKey(group.steps[0].start_at!)) return [];
      return group.steps.map((step) => {
        const start = new Date(step.start_at!);
        const target = new Date(`${value}T00:00:00`);
        target.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), start.getMilliseconds());
        const duration = step.end_at! - step.start_at!;
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
    <p>候補を集め、場所と日程を少しずつ決める。</p>
      <section class="trip-description" aria-label="旅のメモ">
        <div class="description-heading"><button class="memo-toggle" onclick={() => memoOpen = !memoOpen}>旅のメモ {memoOpen ? '▴' : '▾'}</button>{#if memoOpen && hasEditPermission && !descriptionEditing}<button onclick={() => descriptionEditing = true}>編集</button>{/if}</div>
        {#if memoOpen && descriptionEditing}
          <textarea aria-label="旅のメモ" bind:value={memoDraft} rows="5"></textarea>
          <div class="description-actions"><button class="cancel" onclick={() => { memoDraft = getMemoText(itinerary.memo); descriptionEditing = false; }}>キャンセル</button><button onclick={saveMemo}>保存</button></div>
        {:else if memoOpen}
          <p class="description-copy">{getMemoText(itinerary.memo) || '旅の目的や、忘れたくないことをメモできます。'}</p>
        {/if}
      </section>
  </header>

  <nav class="mode-tabs" aria-label="表示切り替え">
    <button class:active={screenMode === "plan"} onclick={() => (screenMode = "plan")}>計画</button>
    <button class:active={screenMode === "map"} onclick={() => (screenMode = "map")}>地図</button>
    <button class:active={screenMode === "schedule"} onclick={() => (screenMode = "schedule")}>日程</button>
  </nav>

  <main>
    {#if screenMode === "plan"}
      <div class="planning-workspace"><div class="planning-list">
      <section class="planning-intro">
        <span>候補を作る</span><i>→</i><span>日を決める</span><i>→</i><span>時間を決める</span>
      </section>

      {#if hasEditPermission}<button class="add-button" onclick={() => openCreate()}>＋ 予定を追加</button>{/if}
      <label class="plan-search">予定を検索<input bind:value={searchQuery} placeholder="タイトル・場所" /></label>

      {#if undecidedSteps.length > 0}
        <section class="draft-section">
          <div class="section-heading"><div><h2>まだ決めていない</h2><p>{undecidedSteps.length}件の候補</p></div></div>
          <div class="step-list">
            {#each undecidedSteps.filter((step) => filteredSteps.includes(step)) as step, index}
              <article class="step-row">
                <button class="step-main" onclick={() => openDetail(step)}>
                  <span class="circle" aria-hidden="true">{stepIcon(step.type)}</span><span><strong>{step.title}</strong><small>未定{step.location ? ` · ${step.location}` : ''}</small>{#if getMemoText(step.notes)}<small>{getMemoText(step.notes)}</small>{/if}</span>
                </button>
                {#if hasEditPermission}<div class="order-buttons"><button onclick={() => moveStep(step, -1, undecidedSteps)} disabled={index === 0} aria-label="上へ移動">↑</button><button onclick={() => moveStep(step, 1, undecidedSteps)} disabled={index === undecidedSteps.length - 1} aria-label="下へ移動">↓</button></div>{/if}
              </article>
            {/each}
          </div>
        </section>
      {/if}

      {#each dayGroups as group}
        <section class="draft-section">
          <div class="section-heading"><div><h2>{group.date.replaceAll('-', '/')}</h2><p>Day {group.day} · {group.steps.length}件</p></div></div>
          {#if group.steps.length}
            <div class="step-list">
              {#each group.steps.filter((step) => filteredSteps.includes(step)) as step, index}
                <article class="step-row">
                  <button class="step-main" onclick={() => openDetail(step)}>
                    <span class="circle" aria-hidden="true">{stepIcon(step.type)}</span><span><strong>{step.title}</strong><small class:time-decided={getStepSchedule(step).precision === "time"}>{dateTimeLabel(step)}</small>{#if step.location}<small>{step.location}</small>{/if}{#if getMemoText(step.notes)}<small>{getMemoText(step.notes)}</small>{/if}</span>
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
      </div><div class="desktop-map"><PlaceMap steps={filteredSteps} numbers={mapNumbers} selected={selectedStepId} canEdit={false} onSelect={(id) => selectedStepId = id} onPin={openCreate} /></div></div>
    {:else if screenMode === "map"}
      {#if hasEditPermission}<div class="map-actions"><button onclick={() => openCreate()}>＋ 予定を追加</button><button class:active={mapPinEditing} onclick={() => mapPinEditing = !mapPinEditing}>{mapPinEditing ? '位置編集を終了' : 'ピンの位置を編集'}</button></div>{/if}
      <div class="map-view"><PlaceMap {steps} numbers={mapNumbers} selected={selectedStepId} canEdit={hasEditPermission} onSelect={(id) => selectedStepId = id} onPin={openCreate} onMove={mapPinEditing ? (id, place) => onUpdateStep?.(id, placeFields(place)) : undefined} /></div>
      {#if selectedStep}<div class="map-card"><button class="map-card-close" onclick={() => selectedStepId = null} aria-label="選択を閉じる">×</button><strong>{selectedStep.title}</strong><span>{dateTimeLabel(selectedStep)}</span><span>{selectedStep.location || '場所名未設定'}</span><div><button onclick={() => openDetail(selectedStep!)}>詳細を見る</button>{#if hasEditPermission}<button onclick={() => openPlaceEditor(selectedStep!)}>位置を修正</button>{/if}</div></div>{/if}
    {:else}
      <div class="preview-heading"><p>旅程プレビュー</p><h2>{itinerary.title}</h2></div>
      {#if undecidedSteps.length > 0}
        <section class="preview-unscheduled"><strong>まだ決めていない予定</strong><span>{undecidedSteps.length}件</span>{#each undecidedSteps as step}<p><button onclick={() => openDetail(step)}>{step.title}</button></p>{/each}</section>
      {/if}
      <div class="preview-days">
        {#each dayGroups.filter((group) => group.steps.length > 0) as group}
          <section class="preview-day"><header><span>Day {group.day}</span><strong>{group.date.slice(5).replace('-', '/')}</strong></header><ol>{#each group.steps as step}<li><time class:pending={getStepSchedule(step).precision !== "time"}>{getStepTimeLabel(step)}</time><div><button class="schedule-step" onclick={() => openDetail(step)}><strong>{step.title}</strong><small>{dateTimeLabel(step)}</small></button>{#if getMemoText(step.notes)}<small>{getMemoText(step.notes)}</small>{/if}</div></li>{/each}</ol></section>
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

  {#if selectedStep && detailOpen && !sheetOpen && !placeEditing}
    <StepDetail step={selectedStep} canEdit={hasEditPermission} dateLabel={dateTimeLabel(selectedStep)} icon={stepIcon(selectedStep.type)} onClose={() => detailOpen = false} onEdit={() => openEdit(selectedStep!)} onPlaceEdit={() => openPlaceEditor(selectedStep!)} onDelete={removeSelectedStep} />
  {/if}

  {#if placeEditing && selectedStep}
    <PlaceEditor step={selectedStep} initialPlace={getPlace(selectedStep)} onClose={() => placeEditing = false} onSave={savePlace} onRemove={removePin} />
  {/if}

  {#if sheetOpen}
    <div class="sheet-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (sheetOpen = false)}>
      <div class="sheet" use:focusSheet role="dialog" aria-modal="true" aria-label={editingStep ? "予定を編集" : "予定を追加"}>
        <div class="sheet-handle"></div><div class="sheet-title"><h2>{editingStep ? "予定を編集" : "予定を追加"}</h2><button onclick={() => (sheetOpen = false)} aria-label="閉じる">×</button></div>
        <form onsubmit={saveStep}>
          {#if formError}<p role="alert">{formError}</p>{/if}
          <label>タイトル<input bind:value={form.title} placeholder="清水寺に行きたい" required /></label>
          <div class="location-field"><span>場所 <small>任意</small></span><PlaceSearch bind:value={form.location} onSelect={selectPlace} /></div>
            {#if placeDraft}
              <div class="pin-fields"><strong>✓ 場所を選択済み</strong><p>{form.location || '地図で選んだ場所'} · ピンの位置を確かめてください。</p>
                {#key `${placeDraft.lat},${placeDraft.lng}`}
                  <div class="pin-preview"><PlaceMap steps={previewPin} numbers={{'preview-pin':1}} selected="preview-pin" canEdit={true} onSelect={() => {}} onPin={(place) => placeDraft = { ...place, priority:form.isPriority }} /></div>
                {/key}
                <button type="button" onclick={() => placeDraft = null}>ピンを外す</button>
              </div>
            {:else}<p class="place-help">まだ場所が決まらないときは、下のタイトルだけで候補を保存できます。</p>{/if}
          <div class="type-picker"><span>予定のアイコン</span><TypePicker value={form.type} onSelect={(type: StepType) => form.type = type} /></div>
          <fieldset><legend>日時</legend><label class="radio"><input type="radio" bind:group={form.when} value="undecided" />まだ決めない</label><label class="radio"><input type="radio" bind:group={form.when} value="day" />日付だけ</label><label class="radio"><input type="radio" bind:group={form.when} value="time" />日時まで</label></fieldset>
          {#if form.when !== "undecided"}
            <div class="date-fields"><label>開始日<input type="date" bind:value={form.date} onchange={() => { if (!endDateTouched) form.endDate = form.date; }} required /></label>{#if form.when === 'time'}<label>開始時刻<input type="time" bind:value={form.time} required /></label><label>終了日<input type="date" bind:value={form.endDate} onchange={() => endDateTouched = true} required /></label><label>終了時刻<input type="time" bind:value={form.endTime} required /></label>{/if}</div>
            {#if form.when === 'time' && form.endDate === form.date && form.endTime <= form.time}<button type="button" class="next-day" onclick={() => form.endDate = nextLocalDate(form.date)}>翌日 {form.endTime} として設定</button>{/if}
          {/if}
          <button type="button" class="extra-toggle" onclick={() => extraFieldsOpen = !extraFieldsOpen}>{extraFieldsOpen ? '詳細を閉じる' : '＋ メモ・リンクなどを追加'}</button>
          {#if extraFieldsOpen}<label>メモ<textarea bind:value={form.note} rows="3" placeholder="朝の方が空いてそう"></textarea></label><label>リンク <small>任意</small><input type="url" bind:value={form.link} placeholder="https://..." /></label><label class="radio"><input type="checkbox" bind:checked={form.isPriority} />優先予定</label>{/if}
          <button class="save-button" type="submit" disabled={saving}>{saving ? "保存中…" : editingStep ? "保存" : "追加"}</button>
          {#if editingStep}<button class="delete-button" type="button" onclick={deleteStep}>この予定を削除</button>{/if}
        </form>
      </div>
    </div>
  {/if}

  {#if batchDayOpen}<div class="batch-day-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (batchDayOpen = false)}><section class="batch-day-modal" role="dialog" aria-modal="true" aria-label="日程をまとめて変更"><header><div><strong>日程をまとめて変更</strong><small>時刻と所要時間はそのままです</small></div><button onclick={() => batchDayOpen = false} aria-label="閉じる">×</button></header>{#each dayGroups as group}<label><span>Day {group.day} · {group.date.slice(5).replace('-', '/')}<small>{group.steps.length}件の予定</small></span><input type="date" bind:value={dayDateDrafts[group.day]} /></label>{/each}<footer><button class="cancel" onclick={() => batchDayOpen = false}>キャンセル</button><button onclick={() => void applyBatchDayChanges()} disabled={saving}>{saving ? '変更中…' : '変更する'}</button></footer></section></div>{/if}

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
  .mode-tabs { position: sticky; z-index: 10; top: 0; display: grid; width: min(680px, 100%); margin: .65rem auto 0; padding: 0 16px; grid-template-columns: repeat(3, 1fr); background: rgba(250,249,245,.94); backdrop-filter: blur(10px); }
  .mode-tabs button { padding: .9rem; border: 0; border-bottom: 1px solid #d9ddd9; color: #7a8581; background: none; font-size: .88rem; font-weight: 700; cursor: pointer; }
  .mode-tabs button.active { border-bottom: 2px solid #2f6657; color: #2f6657; }
  main { width: min(1240px, calc(100% - 32px)); margin: 0 auto; }
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
  .step-main { display: grid; min-width: 0; padding: .8rem 0; border: 0; grid-template-columns: 32px 1fr; gap: .55rem; color: inherit; background: transparent; text-align: left; cursor: pointer; }
  .step-main:disabled { cursor: default; }
  .circle { display:grid; width:30px; height:30px; place-items:center; border-radius:9px; background:#edf4ef; font-size:16px; }
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
  .date-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; }
  .time-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .8rem; }
  .date-fields label { display: grid; gap: .4rem; }
  .date-fields small { color: #929a96; font-size: .65rem; font-weight: 400; }
  .save-button { padding: .85rem; border: 0; border-radius: 999px; color: white; background: #2f6657; font-weight: 750; cursor: pointer; }
  .delete-button { padding: .5rem; border: 0; color: #a14e45; background: transparent; font-size: .75rem; cursor: pointer; }
  .memo-toggle { color:#35695d !important; background:transparent !important; padding:0 !important; font-weight:700; }
  .trip-description { max-width:100%; margin-top:8px; padding:8px 12px; }
  .planning-workspace { display:grid; grid-template-columns:minmax(300px, 38%) minmax(0, 1fr); gap:20px; align-items:start; }
  .planning-list { min-width:0; }
  .desktop-map { position:sticky; top:72px; height:min(76vh,760px); min-width:0; }
  .map-actions { display:flex; justify-content:flex-end; gap:8px; margin:10px 0; }
  .map-actions button { padding:9px 13px; border:1px solid #d3ded6; border-radius:8px; background:white; color:#35695d; cursor:pointer; }
  .map-actions button.active { background:#35695d; color:white; }
  .preview-days,.preview-unscheduled,.theme-guide,.preview-heading,.batch-day-button { max-width:760px; margin-left:auto; margin-right:auto; }
  .plan-search { display:grid; gap:5px; margin:0 0 20px; color:#60736a; font-size:12px; }
  .plan-search input { width:100%; padding:10px; border:1px solid #d9ddd9; border-radius:9px; font:inherit; }
  .map-view { height:calc(100dvh - 220px); min-height:480px; }
  .map-card { position:fixed; z-index:20; bottom:76px; left:50%; display:grid; gap:5px; width:min(430px,calc(100% - 24px)); padding:16px; border-radius:16px; background:white; box-shadow:0 5px 24px #1c352c3d; transform:translateX(-50%); }
  .map-card span { color:#637269; font-size:12px; }
  .map-card .map-card-close { position:absolute; top:8px; right:8px; padding:2px 7px; background:transparent; color:#637269; font-size:20px; }
  .map-card div { display:flex; gap:8px; }
  .map-card button { padding:10px 15px; border:0; border-radius:9px; background:#2f6657; color:white; font:inherit; font-size:12px; font-weight:700; cursor:pointer; }
  .map-card div button + button { background:#edf3ef; color:#2f6657; }
  .next-day,.extra-toggle { margin:8px 0; padding:9px; border:1px solid #b9d1c6; border-radius:8px; color:#2f6657; background:#f2f8f4; cursor:pointer; }
  .schedule-step { display:grid; gap:4px; padding:0; border:0; text-align:left; color:inherit; background:transparent; cursor:pointer; }
  .schedule-step small { color:#748078; }
  @media(max-width:760px) { .planning-workspace { display:block; } .desktop-map { display:none; } .map-view { height:calc(100dvh - 190px); min-height:380px; } .map-view :global(.map-frame) { height:100%; } }
  @media (max-width: 520px) {
    .planning-intro { gap: .28rem; }
    .planning-intro span { padding: .38rem .4rem; font-size: .61rem; }
    .order-buttons button { width: 29px; }
    .preview-day { grid-template-columns: 56px 1fr; }
    .preview-day li { grid-template-columns: 68px 1fr; }
    .date-fields { grid-template-columns: 1fr; }
  }
</style>
