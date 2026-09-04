<script lang="ts">
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import {
    createEndTimestamp,
    createTimestamp,
    getStepDate,
    getStepTime,
  } from "@tabitabi/types";
  import { onMount } from "svelte";
  import { auth } from "$lib/auth";
  import { authApi } from "$lib/api/auth";
  import { handlePasswordAuth } from "$lib/auth/handle-password-auth";
  import { getIsDemoMode } from "$lib/demo";
  import Map from "./components/Map.svelte";
  import {
    buildExternalMapUrl,
    extractCoordinatesFromStep,
    readMapCandidates,
    writeMapCandidates,
    type MapCandidate,
    type MapCandidateCategory,
    type MapPoint,
  } from "./model";

  interface Props {
    itinerary: ItineraryResponse;
    steps: Step[];
    onUpdateItinerary?: (data: {
      title?: string;
      theme_id?: string;
      memo?: string;
    }) => Promise<void>;
    onCreateStep?: (data: {
      title: string;
      start_at: number;
      end_at: number;
      location?: string;
      notes?: string;
      link?: string | null;
    }) => Promise<void>;
  }

  let { itinerary, steps, onUpdateItinerary, onCreateStep }: Props = $props();

  const categoryLabels: Record<MapCandidateCategory, string> = {
    sightseeing: "観光",
    food: "ごはん",
    hotel: "宿",
    shopping: "買い物",
    other: "その他",
  };

  let activeTab = $state<"candidates" | "schedule">("candidates");
  let candidates = $state<MapCandidate[]>(readMapCandidates(itinerary.memo));
  let memoSnapshot = $state(itinerary.memo);
  let lastParentMemo = $state(itinerary.memo);
  let selectedCandidateId = $state<string | null>(null);

  let hasEditPermission = $state(false);
  let showPasswordDialog = $state(false);
  let password = $state("");
  let isAuthenticating = $state(false);

  let showCandidateEditor = $state(false);
  let editingCandidateId = $state<string | null>(null);
  let candidateForm = $state({
    title: "",
    category: "sightseeing" as MapCandidateCategory,
    notes: "",
    lat: 35.6812,
    lng: 139.7671,
  });

  let candidateToSchedule = $state<MapCandidate | null>(null);
  let scheduleDate = $state(toLocalDateInput(new Date()));
  let scheduleTime = $state("10:00");
  let isSaving = $state(false);
  let notice = $state("");

  function toLocalDateInput(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function makeId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
    return `candidate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function toScheduledPoints(items: Step[]): MapPoint[] {
    return [...items]
      .sort((a, b) => a.start_at - b.start_at)
      .map((step, index) => {
        const point = extractCoordinatesFromStep(step);
        if (!point) return null;
        return {
          id: step.id,
          title: step.title,
          lat: point.lat,
          lng: point.lng,
          label: String(index + 1),
        } satisfies MapPoint;
      })
      .filter((point): point is MapPoint => point !== null);
  }

  const sortedSteps = $derived([...steps].sort((a, b) => a.start_at - b.start_at));
  const scheduledPoints = $derived(toScheduledPoints(steps));

  onMount(() => {
    if (getIsDemoMode()) {
      hasEditPermission = true;
      return;
    }

    const token = auth.extractTokenFromUrl();
    if (token && itinerary.is_password_protected) {
      auth.setToken(itinerary.id, itinerary.title, token);
    }
    hasEditPermission = !itinerary.source_itinerary_id && auth.hasEditPermission(itinerary.id);
    auth.updateAccessTime(itinerary.id, itinerary.title);
  });

  $effect(() => {
    const incomingMemo = itinerary.memo;
    if (incomingMemo !== lastParentMemo) {
      lastParentMemo = incomingMemo;
      memoSnapshot = incomingMemo;
      candidates = readMapCandidates(incomingMemo);
    }
  });

  async function attemptEditModeActivation() {
    if (itinerary.source_itinerary_id) return;
    if (getIsDemoMode()) {
      hasEditPermission = true;
      return;
    }

    const token = auth.getToken(itinerary.id);
    if (token && (await authApi.verifyToken(itinerary.id))) {
      hasEditPermission = true;
      return;
    }

    if (!itinerary.is_password_protected) {
      hasEditPermission = true;
      auth.updateAccessTime(itinerary.id, itinerary.title);
      return;
    }

    showPasswordDialog = true;
  }

  async function onPasswordAuth() {
    await handlePasswordAuth({
      shioriId: itinerary.id,
      title: itinerary.title,
      password,
      onSuccess: () => {
        hasEditPermission = true;
        showPasswordDialog = false;
        password = "";
      },
      onError: (message) => alert(message),
      setAuthenticating: (value) => (isAuthenticating = value),
    });
  }

  async function persistCandidates(nextCandidates: MapCandidate[]) {
    if (!onUpdateItinerary) return;
    const nextMemo = writeMapCandidates(memoSnapshot, nextCandidates);
    await onUpdateItinerary({ memo: nextMemo });
    memoSnapshot = nextMemo;
    lastParentMemo = nextMemo;
  }

  function openCandidateEditor(lat: number, lng: number, candidate?: MapCandidate) {
    editingCandidateId = candidate?.id ?? null;
    candidateForm = {
      title: candidate?.title ?? "",
      category: candidate?.category ?? "sightseeing",
      notes: candidate?.notes ?? "",
      lat: candidate?.lat ?? lat,
      lng: candidate?.lng ?? lng,
    };
    showCandidateEditor = true;
  }

  async function handleMapClick(lat: number, lng: number) {
    if (!hasEditPermission) {
      await attemptEditModeActivation();
      if (!hasEditPermission) return;
    }
    openCandidateEditor(lat, lng);
  }

  function handleCandidateClick(candidateId: string) {
    selectedCandidateId = candidateId;
    activeTab = "candidates";
    requestAnimationFrame(() => {
      document.getElementById(`candidate-card-${candidateId}`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }

  async function saveCandidate() {
    const title = candidateForm.title.trim();
    if (!title) {
      notice = "場所の名前を入力してください";
      return;
    }

    const previous = candidates;
    const now = new Date().toISOString();
    let next: MapCandidate[];

    if (editingCandidateId) {
      next = candidates.map((candidate) =>
        candidate.id === editingCandidateId
          ? {
              ...candidate,
              title,
              category: candidateForm.category,
              notes: candidateForm.notes.trim(),
              lat: candidateForm.lat,
              lng: candidateForm.lng,
            }
          : candidate,
      );
    } else {
      const candidate: MapCandidate = {
        id: makeId(),
        title,
        lat: candidateForm.lat,
        lng: candidateForm.lng,
        category: candidateForm.category,
        notes: candidateForm.notes.trim(),
        createdAt: now,
      };
      next = [...candidates, candidate];
      selectedCandidateId = candidate.id;
    }

    candidates = next;
    isSaving = true;
    try {
      await persistCandidates(next);
      showCandidateEditor = false;
      editingCandidateId = null;
      notice = "候補を保存しました";
      activeTab = "candidates";
    } catch (error) {
      console.error("Failed to save map candidate", error);
      candidates = previous;
      notice = "候補を保存できませんでした";
    } finally {
      isSaving = false;
    }
  }

  async function deleteCandidate(candidate: MapCandidate) {
    if (!confirm(`「${candidate.title}」を候補から削除しますか？`)) return;
    const previous = candidates;
    const next = candidates.filter((item) => item.id !== candidate.id);
    candidates = next;
    if (selectedCandidateId === candidate.id) selectedCandidateId = null;
    isSaving = true;
    try {
      await persistCandidates(next);
      showCandidateEditor = false;
      notice = "候補を削除しました";
    } catch (error) {
      console.error("Failed to delete map candidate", error);
      candidates = previous;
      notice = "候補を削除できませんでした";
    } finally {
      isSaving = false;
    }
  }

  function startScheduling(candidate: MapCandidate) {
    candidateToSchedule = candidate;
    const lastStep = sortedSteps[sortedSteps.length - 1];
    scheduleDate = lastStep ? getStepDate(lastStep) : toLocalDateInput(new Date());
    scheduleTime = lastStep ? getStepTime(lastStep) : "10:00";
  }

  async function scheduleCandidate() {
    if (!candidateToSchedule || !onCreateStep || !scheduleDate || !scheduleTime) return;
    const candidate = candidateToSchedule;
    const startAt = createTimestamp(scheduleDate, scheduleTime);
    isSaving = true;
    try {
      await onCreateStep({
        title: candidate.title,
        start_at: startAt,
        end_at: createEndTimestamp(startAt, 60),
        location: candidate.title,
        notes: candidate.notes || undefined,
        link: buildExternalMapUrl(candidate.lat, candidate.lng),
      });

      const next = candidates.filter((item) => item.id !== candidate.id);
      candidates = next;
      await persistCandidates(next);
      selectedCandidateId = null;
      candidateToSchedule = null;
      activeTab = "schedule";
      notice = "予定に追加しました";
    } catch (error) {
      console.error("Failed to schedule map candidate", error);
      notice = "予定に追加できませんでした";
    } finally {
      isSaving = false;
    }
  }

  function formatDate(date: string): string {
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      weekday: "short",
    }).format(parsed);
  }
</script>

<div class="trip-map-theme">
  <section class="map-area">
    <Map
      {candidates}
      {scheduledPoints}
      {selectedCandidateId}
      onMapClick={handleMapClick}
      onCandidateClick={handleCandidateClick}
    />

    <header class="topbar">
      <div class="title-wrap">
        <span class="eyebrow">旅先マップ</span>
        <strong>{itinerary.title}</strong>
      </div>
      {#if !itinerary.source_itinerary_id}
        <button class:editing={hasEditPermission} class="edit-button" onclick={attemptEditModeActivation}>
          {hasEditPermission ? "編集中" : "編集"}
        </button>
      {/if}
    </header>

    {#if hasEditPermission}
      <div class="map-hint">地図をタップして候補を追加</div>
    {/if}
  </section>

  <section class="sheet" aria-label="旅行計画">
    <div class="grabber" aria-hidden="true"></div>
    <nav class="tabs" aria-label="表示切り替え">
      <button class:active={activeTab === "candidates"} onclick={() => (activeTab = "candidates")}>
        候補 <span>{candidates.length}</span>
      </button>
      <button class:active={activeTab === "schedule"} onclick={() => (activeTab = "schedule")}>
        予定 <span>{steps.length}</span>
      </button>
    </nav>

    {#if notice}
      <button class="notice" onclick={() => (notice = "")}>{notice}</button>
    {/if}

    <div class="sheet-content">
      {#if activeTab === "candidates"}
        {#if candidates.length === 0}
          <div class="empty-state">
            <div class="empty-icon">＋</div>
            <strong>気になる場所を置いてみよう</strong>
            <p>{hasEditPermission ? "地図をタップすると候補を追加できます。" : "編集を有効にすると、地図に候補を置けます。"}</p>
            {#if !hasEditPermission && !itinerary.source_itinerary_id}
              <button class="primary-action compact" onclick={attemptEditModeActivation}>編集を始める</button>
            {/if}
          </div>
        {:else}
          <div class="candidate-list">
            {#each candidates as candidate (candidate.id)}
              <article
                id={`candidate-card-${candidate.id}`}
                class:selected={selectedCandidateId === candidate.id}
                class="candidate-card"
                onclick={() => handleCandidateClick(candidate.id)}
              >
                <div class="candidate-main">
                  <div>
                    <span class="category">{categoryLabels[candidate.category]}</span>
                    <h2>{candidate.title}</h2>
                    {#if candidate.notes}<p>{candidate.notes}</p>{/if}
                  </div>
                  <a
                    class="map-link"
                    href={buildExternalMapUrl(candidate.lat, candidate.lng)}
                    target="_blank"
                    rel="noreferrer"
                    onclick={(event) => event.stopPropagation()}
                  >地図↗</a>
                </div>
                {#if hasEditPermission}
                  <div class="candidate-actions" onclick={(event) => event.stopPropagation()}>
                    <button class="secondary-action" onclick={() => openCandidateEditor(candidate.lat, candidate.lng, candidate)}>編集</button>
                    <button class="primary-action" onclick={() => startScheduling(candidate)}>予定に追加</button>
                  </div>
                {/if}
              </article>
            {/each}
          </div>
        {/if}
      {:else}
        {#if sortedSteps.length === 0}
          <div class="empty-state">
            <div class="empty-icon calendar">□</div>
            <strong>予定はまだありません</strong>
            <p>候補から「予定に追加」を選ぶと、ここに並びます。</p>
            <button class="secondary-action compact" onclick={() => (activeTab = "candidates")}>候補を見る</button>
          </div>
        {:else}
          <div class="schedule-list">
            {#each sortedSteps as step, index (step.id)}
              <article class="schedule-row">
                <div class="order-dot">{index + 1}</div>
                <div class="schedule-time">
                  <strong>{getStepTime(step)}</strong>
                  <span>{formatDate(getStepDate(step))}</span>
                </div>
                <div class="schedule-info">
                  <h2>{step.title}</h2>
                  {#if step.notes}<p>{step.notes}</p>{/if}
                </div>
                {#if step.link}
                  <a href={step.link} target="_blank" rel="noreferrer" class="map-link">地図↗</a>
                {/if}
              </article>
            {/each}
            <p class="route-note">地図上の線は訪問順を示す簡易表示です。実際の道路・乗換経路は計算しません。</p>
          </div>
        {/if}
      {/if}
    </div>
  </section>
</div>

{#if showCandidateEditor}
  <div class="modal-backdrop" role="presentation" onclick={() => !isSaving && (showCandidateEditor = false)}>
    <section class="bottom-dialog" role="dialog" aria-modal="true" aria-label={editingCandidateId ? "候補を編集" : "候補を追加"} onclick={(event) => event.stopPropagation()}>
      <div class="dialog-head">
        <div>
          <span class="eyebrow">{editingCandidateId ? "候補を編集" : "新しい候補"}</span>
          <strong>この場所をどうする？</strong>
        </div>
        <button class="close-button" aria-label="閉じる" onclick={() => (showCandidateEditor = false)}>×</button>
      </div>

      <label>
        <span>場所の名前</span>
        <input bind:value={candidateForm.title} placeholder="例：浅草寺" autocomplete="off" />
      </label>

      <label>
        <span>カテゴリ</span>
        <select bind:value={candidateForm.category}>
          <option value="sightseeing">観光</option>
          <option value="food">ごはん</option>
          <option value="hotel">宿</option>
          <option value="shopping">買い物</option>
          <option value="other">その他</option>
        </select>
      </label>

      <label>
        <span>メモ</span>
        <textarea bind:value={candidateForm.notes} rows="3" placeholder="朝に行きたい、ここでランチなど"></textarea>
      </label>

      <div class="coordinate-note">{candidateForm.lat.toFixed(5)}, {candidateForm.lng.toFixed(5)}</div>

      <div class="dialog-actions">
        {#if editingCandidateId}
          {@const editingCandidate = candidates.find((candidate) => candidate.id === editingCandidateId)}
          {#if editingCandidate}
            <button class="danger-action" disabled={isSaving} onclick={() => deleteCandidate(editingCandidate)}>削除</button>
          {/if}
        {/if}
        <button class="primary-action grow" disabled={isSaving} onclick={saveCandidate}>
          {isSaving ? "保存中…" : "候補に保存"}
        </button>
      </div>
    </section>
  </div>
{/if}

{#if candidateToSchedule}
  <div class="modal-backdrop" role="presentation" onclick={() => !isSaving && (candidateToSchedule = null)}>
    <section class="bottom-dialog" role="dialog" aria-modal="true" aria-label="予定に追加" onclick={(event) => event.stopPropagation()}>
      <div class="dialog-head">
        <div>
          <span class="eyebrow">予定に追加</span>
          <strong>{candidateToSchedule.title}</strong>
        </div>
        <button class="close-button" aria-label="閉じる" onclick={() => (candidateToSchedule = null)}>×</button>
      </div>

      <div class="schedule-inputs">
        <label>
          <span>日付</span>
          <input type="date" bind:value={scheduleDate} />
        </label>
        <label>
          <span>時刻</span>
          <input type="time" bind:value={scheduleTime} />
        </label>
      </div>

      <p class="dialog-help">追加後は通常の予定として保存され、ほかのテーマからも確認できます。</p>
      <button class="primary-action full" disabled={isSaving} onclick={scheduleCandidate}>
        {isSaving ? "追加中…" : "この予定で追加"}
      </button>
    </section>
  </div>
{/if}

{#if showPasswordDialog}
  <div class="modal-backdrop" role="presentation" onclick={() => !isAuthenticating && (showPasswordDialog = false)}>
    <section class="bottom-dialog password-dialog" role="dialog" aria-modal="true" aria-label="編集パスワード" onclick={(event) => event.stopPropagation()}>
      <div class="dialog-head">
        <div>
          <span class="eyebrow">編集する</span>
          <strong>パスワードを入力</strong>
        </div>
        <button class="close-button" aria-label="閉じる" onclick={() => (showPasswordDialog = false)}>×</button>
      </div>
      <label>
        <span>編集パスワード</span>
        <input type="password" bind:value={password} onkeydown={(event) => event.key === "Enter" && onPasswordAuth()} />
      </label>
      <button class="primary-action full" disabled={isAuthenticating || !password} onclick={onPasswordAuth}>
        {isAuthenticating ? "確認中…" : "編集を有効にする"}
      </button>
    </section>
  </div>
{/if}

<style>
  :global(body) {
    background: #f8fafc;
  }

  .trip-map-theme {
    min-height: 100dvh;
    background: #f8fafc;
    color: #0f172a;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .map-area {
    position: relative;
    height: 59dvh;
    min-height: 380px;
    overflow: hidden;
    background: #e2e8f0;
  }

  .topbar {
    position: absolute;
    z-index: 8;
    top: max(12px, env(safe-area-inset-top));
    left: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.94);
    padding: 10px 10px 10px 14px;
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.12);
    backdrop-filter: blur(14px);
  }

  .title-wrap {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .title-wrap strong,
  .dialog-head strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
  }

  .eyebrow {
    color: #64748b;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .edit-button {
    flex: 0 0 auto;
    border: 0;
    border-radius: 12px;
    background: #eff6ff;
    padding: 9px 13px;
    color: #1d4ed8;
    font-weight: 800;
  }

  .edit-button.editing {
    background: #dbeafe;
  }

  .map-hint {
    position: absolute;
    z-index: 7;
    left: 50%;
    bottom: 34px;
    transform: translateX(-50%);
    white-space: nowrap;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.84);
    padding: 8px 13px;
    color: white;
    font-size: 12px;
    font-weight: 700;
    box-shadow: 0 6px 18px rgba(15, 23, 42, 0.18);
    pointer-events: none;
  }

  .sheet {
    position: relative;
    z-index: 10;
    min-height: 45dvh;
    margin-top: -20px;
    border-radius: 24px 24px 0 0;
    background: #ffffff;
    box-shadow: 0 -8px 30px rgba(15, 23, 42, 0.1);
  }

  .grabber {
    width: 38px;
    height: 4px;
    margin: 10px auto 6px;
    border-radius: 999px;
    background: #cbd5e1;
  }

  .tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 0 14px;
    border-bottom: 1px solid #e2e8f0;
  }

  .tabs button {
    position: relative;
    border: 0;
    background: transparent;
    padding: 12px 8px 11px;
    color: #64748b;
    font-size: 14px;
    font-weight: 800;
  }

  .tabs button.active {
    color: #1d4ed8;
  }

  .tabs button.active::after {
    content: "";
    position: absolute;
    left: 18%;
    right: 18%;
    bottom: -1px;
    height: 3px;
    border-radius: 999px 999px 0 0;
    background: #2563eb;
  }

  .tabs span {
    display: inline-grid;
    min-width: 20px;
    height: 20px;
    place-items: center;
    margin-left: 4px;
    border-radius: 999px;
    background: #f1f5f9;
    color: #475569;
    font-size: 11px;
  }

  .notice {
    display: block;
    width: calc(100% - 28px);
    margin: 10px 14px 0;
    border: 0;
    border-radius: 12px;
    background: #eff6ff;
    padding: 9px 12px;
    color: #1d4ed8;
    text-align: left;
    font-size: 12px;
    font-weight: 700;
  }

  .sheet-content {
    padding: 12px 14px calc(28px + env(safe-area-inset-bottom));
  }

  .candidate-list,
  .schedule-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .candidate-card {
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    background: #ffffff;
    padding: 13px;
    box-shadow: 0 2px 9px rgba(15, 23, 42, 0.04);
    transition: border-color 0.16s ease, box-shadow 0.16s ease;
  }

  .candidate-card.selected {
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px #dbeafe;
  }

  .candidate-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .candidate-card h2,
  .schedule-row h2 {
    margin: 4px 0 0;
    font-size: 16px;
    line-height: 1.3;
  }

  .candidate-card p,
  .schedule-row p {
    display: -webkit-box;
    overflow: hidden;
    margin: 5px 0 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.5;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .category {
    display: inline-flex;
    border-radius: 999px;
    background: #f1f5f9;
    padding: 3px 8px;
    color: #475569;
    font-size: 10px;
    font-weight: 800;
  }

  .map-link {
    flex: 0 0 auto;
    color: #2563eb;
    font-size: 12px;
    font-weight: 800;
    text-decoration: none;
  }

  .candidate-actions {
    display: grid;
    grid-template-columns: 0.7fr 1.3fr;
    gap: 8px;
    margin-top: 12px;
  }

  .primary-action,
  .secondary-action,
  .danger-action {
    min-height: 42px;
    border-radius: 12px;
    padding: 0 14px;
    font: inherit;
    font-size: 13px;
    font-weight: 800;
  }

  .primary-action {
    border: 1px solid #2563eb;
    background: #2563eb;
    color: #ffffff;
  }

  .secondary-action {
    border: 1px solid #cbd5e1;
    background: #ffffff;
    color: #334155;
  }

  .danger-action {
    border: 1px solid #fecaca;
    background: #fff1f2;
    color: #be123c;
  }

  .primary-action:disabled,
  .secondary-action:disabled,
  .danger-action:disabled {
    cursor: wait;
    opacity: 0.55;
  }

  .compact {
    min-height: 38px;
    margin-top: 14px;
  }

  .full {
    width: 100%;
  }

  .grow {
    flex: 1;
  }

  .empty-state {
    display: flex;
    min-height: 220px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 24px 20px;
    text-align: center;
  }

  .empty-state strong {
    margin-top: 10px;
    font-size: 16px;
  }

  .empty-state p {
    max-width: 300px;
    margin: 6px 0 0;
    color: #64748b;
    font-size: 13px;
    line-height: 1.6;
  }

  .empty-icon {
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 16px;
    background: #dbeafe;
    color: #2563eb;
    font-size: 28px;
    font-weight: 300;
  }

  .empty-icon.calendar {
    font-size: 20px;
  }

  .schedule-row {
    display: grid;
    grid-template-columns: 30px 68px minmax(0, 1fr) auto;
    align-items: start;
    gap: 8px;
    border-bottom: 1px solid #f1f5f9;
    padding: 8px 0 14px;
  }

  .order-dot {
    width: 27px;
    height: 27px;
    display: grid;
    place-items: center;
    margin-top: 1px;
    border-radius: 999px;
    background: #2563eb;
    color: white;
    font-size: 11px;
    font-weight: 800;
  }

  .schedule-time {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .schedule-time strong {
    font-size: 13px;
  }

  .schedule-time span {
    color: #94a3b8;
    font-size: 10px;
  }

  .schedule-info {
    min-width: 0;
  }

  .schedule-info h2 {
    margin-top: 1px;
    font-size: 14px;
  }

  .route-note {
    margin: 8px 4px 0;
    color: #94a3b8;
    font-size: 10px;
    line-height: 1.5;
  }

  .modal-backdrop {
    position: fixed;
    z-index: 1000;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(15, 23, 42, 0.34);
    backdrop-filter: blur(2px);
  }

  .bottom-dialog {
    width: 100%;
    max-height: min(78dvh, 680px);
    overflow-y: auto;
    border-radius: 24px 24px 0 0;
    background: #ffffff;
    padding: 18px 16px calc(18px + env(safe-area-inset-bottom));
    box-shadow: 0 -16px 50px rgba(15, 23, 42, 0.2);
  }

  .dialog-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;
  }

  .dialog-head > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .close-button {
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    border: 0;
    border-radius: 999px;
    background: #f1f5f9;
    color: #475569;
    font-size: 22px;
    line-height: 1;
  }

  .bottom-dialog label {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 12px;
  }

  .bottom-dialog label > span {
    color: #475569;
    font-size: 11px;
    font-weight: 800;
  }

  .bottom-dialog input,
  .bottom-dialog select,
  .bottom-dialog textarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid #cbd5e1;
    border-radius: 12px;
    background: #ffffff;
    padding: 11px 12px;
    color: #0f172a;
    font: inherit;
    font-size: 16px;
    outline: none;
  }

  .bottom-dialog input:focus,
  .bottom-dialog select:focus,
  .bottom-dialog textarea:focus {
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px #dbeafe;
  }

  .bottom-dialog textarea {
    resize: vertical;
  }

  .coordinate-note {
    margin-top: 8px;
    color: #94a3b8;
    font-size: 10px;
  }

  .dialog-actions {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  .schedule-inputs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .dialog-help {
    margin: 14px 2px;
    color: #64748b;
    font-size: 11px;
    line-height: 1.5;
  }

  @media (min-width: 768px) {
    .trip-map-theme {
      display: grid;
      height: 100dvh;
      min-height: 620px;
      grid-template-columns: minmax(0, 1fr) 390px;
      overflow: hidden;
    }

    .map-area {
      height: 100%;
      min-height: 0;
    }

    .sheet {
      height: 100%;
      min-height: 0;
      margin-top: 0;
      border-radius: 0;
      overflow-y: auto;
      box-shadow: -10px 0 30px rgba(15, 23, 42, 0.08);
    }

    .grabber {
      display: none;
    }

    .tabs {
      padding-top: 8px;
    }

    .modal-backdrop {
      align-items: center;
      padding: 24px;
    }

    .bottom-dialog {
      width: min(440px, 100%);
      border-radius: 22px;
      padding: 20px;
    }
  }
</style>
