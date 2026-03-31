<script lang="ts">
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import { getAvailableThemes } from "$lib/themes";
  import { auth } from "$lib/auth";
  import { authApi } from "$lib/api/auth";
  import { handlePasswordAuth } from "$lib/auth/handle-password-auth";
  import { getIsDemoMode } from "$lib/demo";
  import { onMount } from "svelte";
  import { renderMarkdown } from "./utils/markdown";
  import DayCardView from "./views/DayCardView.svelte";
  import WeekCardView from "./views/WeekCardView.svelte";
  import MonthCardView from "./views/MonthCardView.svelte";
  import ListView from "./views/ListView.svelte";
  import WeekView from "./views/WeekView.svelte";
  import MonthView from "./views/MonthView.svelte";
  import StepDetailDialog from "./components/StepDetailDialog.svelte";
  import StepEditForm from "./components/StepEditForm.svelte";
  import SettingsDialog from "./components/SettingsDialog.svelte";
  import MemoDialog from "./components/MemoDialog.svelte";
  import "./styles/index.css";

  interface Props {
    itinerary: ItineraryResponse;
    steps: Step[];
    onUpdateItinerary?: (data: {
      title?: string;
      theme_id?: string;
      memo?: string;
      walica_id?: string | null;
      secret_settings?: { enabled: boolean; offset_minutes: number } | null;
    }) => Promise<void>;
    onCreateStep?: (data: { title: string; date: string; time: string; location?: string; notes?: string }) => Promise<void>;
    onUpdateStep?: (stepId: string, data: { title?: string; date?: string; time?: string; location?: string; notes?: string }) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
  }

  let { itinerary, steps, onUpdateItinerary, onCreateStep, onUpdateStep, onDeleteStep }: Props = $props();

  type ViewMode = 'day-card' | 'week-card' | 'month-card' | 'list' | 'week' | 'month';

  const viewTabs: Array<{ id: ViewMode; label: string }> = [
    { id: 'day-card', label: '日カード' },
    { id: 'week-card', label: '週カード' },
    { id: 'month-card', label: '月カード' },
    { id: 'list', label: 'リスト' },
    { id: 'week', label: '週' },
    { id: 'month', label: '月' },
  ];

  let currentView = $state<ViewMode>('day-card');
  let hasEditPermission = $state(false);
  let editingStepId = $state<string | null>(null);
  let selectedStep = $state<Step | null>(null);
  let showDetailDialog = $state(false);
  let showEditForm = $state(false);
  let showAddForm = $state(false);
  let showMemoDialog = $state(false);
  let showSettingsDialog = $state(false);
  let isEditingTitle = $state(false);
  let editedTitle = $state(itinerary.title);

  let selectedThemeId = $state(itinerary.theme_id || 'standard-seasons');
  let secretModeEnabled = $state(itinerary.secret_settings?.enabled ?? false);
  let secretModeOffset = $state(itinerary.secret_settings?.offset_minutes ?? 60);
  let walicaUrl = $state(itinerary.walica_id ? `https://walica.jp/group/${itinerary.walica_id}` : '');

  const themes = getAvailableThemes();

  onMount(() => {
    if (getIsDemoMode()) {
      hasEditPermission = true;
      return;
    }
    const token = auth.extractTokenFromUrl();
    if (token && itinerary.is_password_protected) {
      auth.setToken(itinerary.id, itinerary.title, token);
    }
    hasEditPermission = auth.hasEditPermission(itinerary.id);
    if (!hasEditPermission && !itinerary.is_password_protected) {
      hasEditPermission = true;
    }
    if (hasEditPermission) {
      auth.updateAccessTime(itinerary.id, itinerary.title);
    }
  });

  function switchView(view: ViewMode) {
    if (editingStepId !== null) {
      if (!confirm('編集中の内容が失われます。閲覧モードに切り替えますか？')) return;
      editingStepId = null;
      showEditForm = false;
    }
    currentView = view;
  }

  function handleEditStep(step: Step) {
    editingStepId = step.id;
    selectedStep = step;
    showDetailDialog = false;
    showEditForm = true;
  }

  function handleSelectStep(step: Step) {
    selectedStep = step;
    showDetailDialog = true;
  }

  async function handleSaveStep(stepId: string | null, data: { title: string; date: string; time: string; location?: string; notes?: string }) {
    if (stepId === null) {
      if (onCreateStep) await onCreateStep(data);
    } else {
      if (onUpdateStep) await onUpdateStep(stepId, data);
    }
    editingStepId = null;
    showEditForm = false;
    showAddForm = false;
  }

  function handleCloseEditForm() {
    editingStepId = null;
    showEditForm = false;
    showAddForm = false;
  }

  async function handleMemoUpdate(memo: string) {
    if (onUpdateItinerary) await onUpdateItinerary({ memo });
    showMemoDialog = false;
  }

  async function handleTitleUpdate() {
    if (!editedTitle.trim() || editedTitle === itinerary.title) {
      isEditingTitle = false;
      editedTitle = itinerary.title;
      return;
    }
    if (onUpdateItinerary) await onUpdateItinerary({ title: editedTitle.trim() });
    isEditingTitle = false;
  }

  async function handleThemeChange(themeId: string) {
    selectedThemeId = themeId;
    if (themeId !== itinerary.theme_id && onUpdateItinerary) {
      await onUpdateItinerary({ theme_id: themeId });
    }
  }

  async function handleSecretModeUpdate(enabled: boolean, offset: number) {
    secretModeEnabled = enabled;
    secretModeOffset = offset;
    if (onUpdateItinerary) {
      await onUpdateItinerary({ secret_settings: { enabled, offset_minutes: offset } });
    }
  }

  async function handleWalicaUpdate(url: string) {
    if (url && !url.startsWith('https://walica.jp/group/')) {
      alert('WalicaのURLは https://walica.jp/group/ で始まる必要があります');
      return;
    }
    walicaUrl = url;
    const walicaId = url ? url.split('/group/')[1] : null;
    if (onUpdateItinerary) await onUpdateItinerary({ walica_id: walicaId });
  }

  const viewProps = $derived({
    steps,
    hasEditPermission,
    onUpdateStep,
    onDeleteStep,
    onEditStep: handleEditStep,
    onSelectStep: handleSelectStep,
  });
</script>

<div class="ss-theme">
  <div class="ss-container">
    <header class="ss-header">
      <div class="ss-header-top">
        {#if isEditingTitle && hasEditPermission}
          <input
            type="text"
            bind:value={editedTitle}
            onblur={handleTitleUpdate}
            onkeydown={(e) => e.key === 'Enter' && handleTitleUpdate()}
            class="ss-title-input"
          />
        {:else}
          <button
            type="button"
            class="ss-title-btn"
            onclick={() => { if (hasEditPermission) isEditingTitle = true; }}
            disabled={!hasEditPermission}
          >{itinerary.title}</button>
        {/if}
        <button
          type="button"
          class="ss-settings-btn"
          onclick={() => (showSettingsDialog = true)}
          aria-label="設定"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
        </button>
      </div>

      {#if itinerary.memo}
        {#if hasEditPermission}
          <button
            type="button"
            class="ss-memo-display"
            onclick={(e) => { if ((e.target as HTMLElement).closest('a')) return; showMemoDialog = true; }}
          >
            {@html renderMarkdown(itinerary.memo)}
          </button>
        {:else}
          <div class="ss-memo-display">
            {@html renderMarkdown(itinerary.memo)}
          </div>
        {/if}
      {:else if hasEditPermission}
        <button onclick={() => (showMemoDialog = true)} class="ss-memo-add-btn">📝 メモを追加</button>
      {/if}
    </header>

    {#if hasEditPermission}
      <div class="ss-add-step-bar">
        <button class="ss-add-step-btn" onclick={() => (showAddForm = true)}>＋ 予定を追加</button>
      </div>
    {/if}

    <main class="ss-main">
      {#if currentView === 'day-card'}
        <DayCardView {...viewProps} />
      {:else if currentView === 'week-card'}
        <WeekCardView {...viewProps} />
      {:else if currentView === 'month-card'}
        <MonthCardView {...viewProps} />
      {:else if currentView === 'list'}
        <ListView {...viewProps} />
      {:else if currentView === 'week'}
        <WeekView {...viewProps} />
      {:else if currentView === 'month'}
        <MonthView {...viewProps} />
      {/if}
    </main>

    <nav class="ss-tabs" aria-label="表示切替">
      {#each viewTabs as tab}
        <button
          type="button"
          class="ss-tab {currentView === tab.id ? 'ss-tab--active' : ''}"
          onclick={() => switchView(tab.id)}
        >{tab.label}</button>
      {/each}
    </nav>
  </div>

  <StepDetailDialog
    show={showDetailDialog}
    step={selectedStep}
    {hasEditPermission}
    onEdit={handleEditStep}
    onClose={() => (showDetailDialog = false)}
  />

  <StepEditForm
    show={showEditForm}
    step={selectedStep}
    onSave={handleSaveStep}
    onClose={handleCloseEditForm}
  />

  <StepEditForm
    show={showAddForm}
    step={null}
    onSave={handleSaveStep}
    onClose={() => (showAddForm = false)}
  />

  <MemoDialog
    show={showMemoDialog}
    memo={itinerary.memo ?? ''}
    {hasEditPermission}
    onSave={handleMemoUpdate}
    onClose={() => (showMemoDialog = false)}
  />

  <SettingsDialog
    show={showSettingsDialog}
    {themes}
    {selectedThemeId}
    {secretModeEnabled}
    {secretModeOffset}
    {walicaUrl}
    onThemeChange={handleThemeChange}
    onSecretModeChange={handleSecretModeUpdate}
    onWalicaUpdate={handleWalicaUpdate}
    onClose={() => (showSettingsDialog = false)}
  />
</div>
