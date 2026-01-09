<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface Props {
    steps: Step[];
    hasEditPermission: boolean;
    isViewMode: boolean;
    onAddSauna?: () => void;
    onUpdateStep?: (
      stepId: string,
      data: {
        title?: string;
        date?: string;
        time?: string;
        location?: string;
        notes?: string;
      },
    ) => Promise<void>;
    onDeleteStep?: (stepId: string) => Promise<void>;
  }

  let { steps, hasEditPermission, isViewMode, onAddSauna, onUpdateStep, onDeleteStep }: Props = $props();

  interface SaunaData {
    visited?: boolean;
    visit_date?: string;
    sauna_url?: string;
  }

  let editingStepId = $state<string | null>(null);
  let editTitle = $state("");
  let editUrl = $state("");
  let showDeleteConfirm = $state<string | null>(null);

  function parseSaunaData(notes: string | null | undefined): SaunaData {
    if (!notes) return {};
    try {
      const parsed = JSON.parse(notes);
      if (typeof parsed === "object") return parsed;
    } catch {
      return {};
    }
    return {};
  }

  function getSaunaData(step: Step): SaunaData {
    return parseSaunaData(step.notes);
  }

  async function toggleVisited(step: Step, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!onUpdateStep) return;

    const data = getSaunaData(step);
    const newData: SaunaData = {
      ...data,
      visited: !data.visited,
      visit_date: !data.visited ? new Date().toISOString().split("T")[0] : undefined,
    };

    await onUpdateStep(step.id, {
      notes: JSON.stringify({ text: "", ...newData }),
    });
  }

  function handleCardClick(step: Step, event: MouseEvent) {
    if (editingStepId === step.id) return;
    
    const data = getSaunaData(step);
    if (data.sauna_url) {
      window.open(data.sauna_url, "_blank", "noopener,noreferrer");
    }
  }

  function startEdit(step: Step, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    if (!hasEditPermission) return;
    editingStepId = step.id;
    editTitle = step.title;
    const data = getSaunaData(step);
    editUrl = data.sauna_url || "";
  }

  function cancelEdit() {
    editingStepId = null;
    editTitle = "";
    editUrl = "";
  }

  async function saveEdit(step: Step) {
    if (!onUpdateStep) return;

    const data = getSaunaData(step);
    const newData: SaunaData = {
      ...data,
      sauna_url: editUrl.trim() || undefined,
    };

    await onUpdateStep(step.id, {
      title: editTitle.trim(),
      notes: JSON.stringify({ text: "", ...newData }),
    });

    editingStepId = null;
    editTitle = "";
    editUrl = "";
  }

  async function handleDelete(stepId: string) {
    if (!onDeleteStep) return;
    await onDeleteStep(stepId);
    showDeleteConfirm = null;
  }

  const sortedSteps = $derived(
    [...steps].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    }),
  );
</script>

<div class="stamp-rally-grid">
  {#if sortedSteps.length === 0}
    <div class="empty-stamp-card">
      <div class="stamp-area empty">
        <div class="empty-stamp-circle">
          <div class="empty-stamp-text">
            <div class="empty-stamp-message">サウナを</div>
            <div class="empty-stamp-message">追加しましょう！</div>
          </div>
        </div>
        {#if hasEditPermission && onAddSauna}
          <button class="empty-add-button" onclick={() => onAddSauna?.()}>
            + サウナを追加
          </button>
        {/if}
      </div>
    </div>
  {:else}
    {#each sortedSteps as step (step.id)}
      {@const saunaData = getSaunaData(step)}
      {@const isVisited = saunaData.visited ?? false}
      {@const isEditing = editingStepId === step.id}

      <div 
        class="stamp-card" 
        class:completed={isVisited}
        class:editing={isEditing}
        onclick={(e) => !isEditing && handleCardClick(step, e)}
        role="button"
        tabindex="0"
      >
        {#if !isEditing}
          <div class="stamp-card-name">{step.title}</div>
          
          <div class="stamp-area" class:stamped={isVisited}>
            {#if isVisited}
              <div class="stamp-image">
                <div class="stamp-circle">
                  <div class="stamp-text">
                    <div class="stamp-top">サウナ</div>
                    <div class="stamp-date">{saunaData.visit_date || ''}</div>
                    <div class="stamp-bottom">達成</div>
                  </div>
                </div>
              </div>
            {:else}
              <div class="stamp-image pending">
                <div class="stamp-circle pending">
                  <div class="stamp-text pending">
                    <div class="stamp-top">サウナ</div>
                    <div class="stamp-date pending"></div>
                    <div class="stamp-bottom pending">未達成</div>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <div class="stamp-card-actions">
            <button
              class="complete-button"
              class:undo={isVisited}
              onclick={(e) => toggleVisited(step, e)}
            >
              {isVisited ? '取消' : '完了'}
            </button>
            {#if hasEditPermission && !isViewMode}
              <button
                class="edit-icon-button"
                onclick={(e) => startEdit(step, e)}
                title="編集"
              >
                ✏️
              </button>
              <button
                class="delete-icon-button"
                onclick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  showDeleteConfirm = step.id;
                }}
                title="削除"
              >
                🗑️
              </button>
            {/if}
          </div>
        {:else}
          <div
            class="edit-form-inline"
            onclick={(e) => e.stopPropagation()}
            onmousedown={(e) => e.stopPropagation()}
          >
            <div class="form-group">
              <label>施設名</label>
              <input
                type="text"
                bind:value={editTitle}
                placeholder="サウナ施設名"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label>URL</label>
              <input
                type="url"
                bind:value={editUrl}
                placeholder="https://..."
                class="form-input"
              />
              <div class="reference-link">
                参考: <a href="https://sauna-ikitai.com/" target="_blank" rel="noopener noreferrer">サウナイキタイ</a>
              </div>
            </div>

            <div class="form-actions-inline">
              <button class="button-cancel" onclick={(e) => { e.stopPropagation(); cancelEdit(); }}>
                キャンセル
              </button>
              <button class="button-save" onclick={() => saveEdit(step)}>
                保存
              </button>
            </div>
          </div>
        {/if}

        {#if showDeleteConfirm === step.id}
          <div class="delete-confirm-overlay" onclick={(e) => e.stopPropagation()}>
            <p>削除しますか？</p>
            <div class="confirm-actions">
              <button
                class="button-cancel"
                onclick={(e) => {
                  e.stopPropagation();
                  showDeleteConfirm = null;
                }}
              >
                いいえ
              </button>
              <button
                class="button-danger"
                onclick={(e) => {
                  e.stopPropagation();
                  handleDelete(step.id);
                }}
              >
                はい
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>
