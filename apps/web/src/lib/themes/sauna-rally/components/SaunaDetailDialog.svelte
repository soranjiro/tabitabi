<script lang="ts">
  import type { Step } from "@tabitabi/types";

  interface SaunaData {
    visited?: boolean;
    visit_date?: string;
    sauna_url?: string;
    rating?: number;
    comment?: string;
    sauna_temp?: number;
    water_temp?: number;
    sauna_type?: string;
    tottonoi_level?: number;
  }

  interface Props {
    show: boolean;
    step: Step | null;
    hasEditPermission: boolean;
    isViewMode: boolean;
    onUpdate?: (
      stepId: string,
      data: { title?: string; notes?: string },
    ) => Promise<void>;
    onDelete?: (stepId: string) => Promise<void>;
    onClose: () => void;
  }

  let {
    show,
    step,
    hasEditPermission,
    isViewMode,
    onUpdate,
    onDelete,
    onClose,
  }: Props = $props();

  const SAUNA_TYPES = [
    { value: "dry", label: "ドライサウナ" },
    { value: "wet", label: "ウェットサウナ" },
    { value: "steam", label: "スチームサウナ" },
    { value: "other", label: "その他" },
  ];

  let editTitle = $state("");
  let editUrl = $state("");
  let editVisited = $state(false);
  let editVisitDate = $state("");
  let editRating = $state(0);
  let editComment = $state("");
  let editSaunaTemp = $state<number | "">("");
  let editWaterTemp = $state<number | "">("");
  let editSaunaType = $state("");
  let editTotonoiLevel = $state(0);
  let isSaving = $state(false);
  let showDeleteConfirm = $state(false);
  let isEditing = $state(false);

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

  $effect(() => {
    if (show && step) {
      const data = parseSaunaData(step.notes);
      editTitle = step.title;
      editUrl = data.sauna_url || "";
      editVisited = data.visited ?? false;
      editVisitDate = data.visit_date || "";
      editRating = data.rating ?? 0;
      editComment = data.comment || "";
      editSaunaTemp = data.sauna_temp ?? "";
      editWaterTemp = data.water_temp ?? "";
      editSaunaType = data.sauna_type || "";
      editTotonoiLevel = data.tottonoi_level ?? 0;
      isEditing = false;
      showDeleteConfirm = false;
    }
  });

  const saunaData = $derived(step ? parseSaunaData(step.notes) : {});

  async function handleSave() {
    if (!step || !onUpdate) return;
    isSaving = true;
    const base = parseSaunaData(step.notes);
    const newData: SaunaData = {
      ...base,
      sauna_url: editUrl.trim() || undefined,
      visited: editVisited,
      visit_date: editVisited
        ? editVisitDate || new Date().toISOString().split("T")[0]
        : undefined,
      rating: editRating || undefined,
      comment: editComment.trim() || undefined,
      sauna_temp: editSaunaTemp !== "" ? Number(editSaunaTemp) : undefined,
      water_temp: editWaterTemp !== "" ? Number(editWaterTemp) : undefined,
      sauna_type: editSaunaType || undefined,
      tottonoi_level: editTotonoiLevel || undefined,
    };
    await onUpdate(step.id, {
      title: editTitle.trim(),
      notes: JSON.stringify({ text: "", ...newData }),
    });
    isSaving = false;
    isEditing = false;
  }

  async function handleToggleVisited() {
    if (!step || !onUpdate) return;
    const data = parseSaunaData(step.notes);
    const nowVisited = !data.visited;
    const newData: SaunaData = {
      ...data,
      visited: nowVisited,
      visit_date: nowVisited
        ? new Date().toISOString().split("T")[0]
        : undefined,
    };
    await onUpdate(step.id, {
      notes: JSON.stringify({ text: "", ...newData }),
    });
  }

  async function handleDelete() {
    if (!step || !onDelete) return;
    await onDelete(step.id);
    onClose();
  }
</script>

{#if show && step}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="sd-overlay" onclick={onClose}>
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="sd-dialog" onclick={(e) => e.stopPropagation()}>
      <!-- Header -->
      <div class="sd-header" class:visited={saunaData.visited}>
        {#if isEditing}
          <input
            class="sd-title-input"
            type="text"
            bind:value={editTitle}
            placeholder="施設名"
          />
        {:else}
          <h2 class="sd-title">{step.title}</h2>
        {/if}
        <button class="sd-close" onclick={onClose}>✕</button>
      </div>

      <!-- Visit badge -->
      <div class="sd-visit-badge" class:visited={saunaData.visited}>
        {#if saunaData.visited}
          🔥 達成！{saunaData.visit_date ? `(${saunaData.visit_date})` : ""}
        {:else}
          💧 未訪問
        {/if}
      </div>

      <!-- Body -->
      <div class="sd-body">
        {#if isEditing}
          <!-- Visit status -->
          <div class="sd-field">
            <label class="sd-label">訪問ステータス</label>
            <label class="sd-toggle">
              <input
                type="checkbox"
                bind:checked={editVisited}
                class="sd-checkbox"
              />
              <span>{editVisited ? "訪問済み ✅" : "未訪問"}</span>
            </label>
            {#if editVisited}
              <input
                type="date"
                bind:value={editVisitDate}
                class="sd-input"
                style="margin-top: 0.5rem"
              />
            {/if}
          </div>

          <!-- Type -->
          <div class="sd-field">
            <label class="sd-label" for="sd-type">サウナタイプ</label>
            <select id="sd-type" bind:value={editSaunaType} class="sd-input">
              <option value="">選択してください</option>
              {#each SAUNA_TYPES as t}
                <option value={t.value}>{t.label}</option>
              {/each}
            </select>
          </div>

          <!-- Temperatures -->
          <div class="sd-temp-row">
            <div class="sd-field">
              <label class="sd-label" for="sd-sauna-temp">🔥 サウナ室</label>
              <div class="sd-temp-wrap">
                <input
                  id="sd-sauna-temp"
                  type="number"
                  bind:value={editSaunaTemp}
                  placeholder="90"
                  class="sd-input sd-temp-input"
                  min="50"
                  max="150"
                />
                <span class="sd-unit">°C</span>
              </div>
            </div>
            <div class="sd-field">
              <label class="sd-label" for="sd-water-temp">❄️ 水風呂</label>
              <div class="sd-temp-wrap">
                <input
                  id="sd-water-temp"
                  type="number"
                  bind:value={editWaterTemp}
                  placeholder="15"
                  class="sd-input sd-temp-input"
                  min="1"
                  max="30"
                />
                <span class="sd-unit">°C</span>
              </div>
            </div>
          </div>

          <!-- Rating -->
          <div class="sd-field">
            <label class="sd-label">評価</label>
            <div class="sd-stars">
              {#each [1, 2, 3, 4, 5] as star}
                <button
                  type="button"
                  class="sd-star"
                  class:active={editRating >= star}
                  onclick={() =>
                    (editRating = editRating === star ? 0 : star)}
                >★</button>
              {/each}
            </div>
          </div>

          <!-- Tottonoi level -->
          <div class="sd-field">
            <label class="sd-label">整いレベル</label>
            <div class="sd-tottonoi-btns">
              {#each [1, 2, 3, 4, 5] as lv}
                <button
                  type="button"
                  class="sd-tottonoi-btn"
                  class:active={editTotonoiLevel >= lv}
                  onclick={() =>
                    (editTotonoiLevel = editTotonoiLevel === lv ? 0 : lv)}
                >
                  {lv <= 2 ? "😌" : lv <= 4 ? "😮" : "🤯"}
                </button>
              {/each}
            </div>
          </div>

          <!-- Comment -->
          <div class="sd-field">
            <label class="sd-label" for="sd-comment">メモ</label>
            <textarea
              id="sd-comment"
              bind:value={editComment}
              placeholder="感想、施設の特徴など..."
              class="sd-textarea"
              rows={3}
            ></textarea>
          </div>

          <!-- URL -->
          <div class="sd-field">
            <label class="sd-label" for="sd-url">施設URL</label>
            <input
              id="sd-url"
              type="url"
              bind:value={editUrl}
              placeholder="https://sauna-ikitai.com/..."
              class="sd-input"
            />
          </div>
        {:else}
          <!-- View mode -->
          {#if saunaData.sauna_type}
            <div class="sd-info-row">
              <span class="sd-info-lbl">タイプ</span>
              <span class="sd-info-val"
                >{SAUNA_TYPES.find((t) => t.value === saunaData.sauna_type)
                  ?.label ?? saunaData.sauna_type}</span
              >
            </div>
          {/if}

          {#if saunaData.sauna_temp || saunaData.water_temp}
            <div class="sd-temps">
              {#if saunaData.sauna_temp}
                <span class="sd-temp-chip sd-temp-sauna"
                  >🔥 {saunaData.sauna_temp}°C</span
                >
              {/if}
              {#if saunaData.water_temp}
                <span class="sd-temp-chip sd-temp-water"
                  >❄️ {saunaData.water_temp}°C</span
                >
              {/if}
            </div>
          {/if}

          {#if saunaData.rating}
            <div class="sd-info-row">
              <span class="sd-info-lbl">評価</span>
              <span class="sd-stars-view">
                {#each [1, 2, 3, 4, 5] as star}
                  <span
                    class="sd-star-view"
                    class:active={saunaData.rating != null &&
                      saunaData.rating >= star}>★</span
                  >
                {/each}
              </span>
            </div>
          {/if}

          {#if saunaData.tottonoi_level}
            <div class="sd-info-row">
              <span class="sd-info-lbl">整いレベル</span>
              <div class="sd-tottonoi-view">
                {#each [1, 2, 3, 4, 5] as lv}
                  <span
                    class:active={saunaData.tottonoi_level != null &&
                      saunaData.tottonoi_level >= lv}
                  >
                    {lv <= 2 ? "😌" : lv <= 4 ? "😮" : "🤯"}
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          {#if saunaData.comment}
            <div class="sd-comment-view">
              <p>{saunaData.comment}</p>
            </div>
          {/if}

          {#if saunaData.sauna_url}
            <a
              href={saunaData.sauna_url}
              target="_blank"
              rel="noopener noreferrer"
              class="sd-url-link"
            >
              🔗 施設ページを見る
            </a>
          {/if}

          {#if !saunaData.sauna_type && !saunaData.sauna_temp && !saunaData.water_temp && !saunaData.rating && !saunaData.tottonoi_level && !saunaData.comment && !saunaData.sauna_url}
            <p class="sd-empty-hint">編集ボタンから詳細情報を記録できます。</p>
          {/if}
        {/if}
      </div>

      <!-- Actions -->
      <div class="sd-actions">
        {#if showDeleteConfirm}
          <span class="sd-confirm-text">本当に削除しますか？</span>
          <button
            class="sd-btn sd-btn-secondary"
            onclick={() => (showDeleteConfirm = false)}>いいえ</button
          >
          <button class="sd-btn sd-btn-danger" onclick={handleDelete}
            >削除</button
          >
        {:else if isEditing}
          <button
            class="sd-btn sd-btn-secondary"
            onclick={() => (isEditing = false)}
            disabled={isSaving}>キャンセル</button
          >
          <button
            class="sd-btn sd-btn-primary"
            onclick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
        {:else}
          {#if hasEditPermission && !isViewMode}
            <button
              class="sd-btn sd-btn-danger-outline"
              onclick={() => (showDeleteConfirm = true)}>削除</button
            >
            <button class="sd-btn sd-btn-visit" onclick={handleToggleVisited}>
              {saunaData.visited ? "未訪問に戻す" : "🔥 達成！"}
            </button>
            <button
              class="sd-btn sd-btn-primary"
              onclick={() => (isEditing = true)}>編集</button
            >
          {/if}
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .sd-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .sd-dialog {
    background: white;
    border-radius: 20px;
    width: 100%;
    max-width: 440px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
    overflow: hidden;
  }

  .sd-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1.25rem 1.25rem 0.75rem;
    background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  }

  .sd-header.visited {
    background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
  }

  .sd-title {
    flex: 1;
    margin: 0;
    font-size: 1.2rem;
    font-weight: 700;
    color: white;
  }

  .sd-title-input {
    flex: 1;
    font-size: 1.1rem;
    font-weight: 700;
    padding: 0.4rem 0.75rem;
    border: 2px solid rgba(255, 255, 255, 0.6);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    font-family: inherit;
  }

  .sd-title-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
  }

  .sd-close {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sd-close:hover {
    background: rgba(255, 255, 255, 0.35);
  }

  .sd-visit-badge {
    padding: 0.5rem 1.25rem;
    background: #fff3e0;
    color: #e65100;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .sd-visit-badge.visited {
    background: #e8f5e9;
    color: #1b5e20;
  }

  .sd-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .sd-field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .sd-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: #555;
  }

  .sd-input {
    width: 100%;
    padding: 0.55rem 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 0.95rem;
    font-family: inherit;
    box-sizing: border-box;
    transition: border-color 0.2s;
    background: white;
  }

  .sd-input:focus {
    outline: none;
    border-color: #ff6b35;
  }

  .sd-textarea {
    width: 100%;
    padding: 0.55rem 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 0.95rem;
    font-family: inherit;
    box-sizing: border-box;
    resize: vertical;
    transition: border-color 0.2s;
  }

  .sd-textarea:focus {
    outline: none;
    border-color: #ff6b35;
  }

  .sd-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
    cursor: pointer;
  }

  .sd-checkbox {
    width: 16px;
    height: 16px;
    accent-color: #ff6b35;
    cursor: pointer;
  }

  .sd-temp-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .sd-temp-wrap {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .sd-temp-input {
    width: 80px;
  }

  .sd-unit {
    font-size: 0.9rem;
    color: #666;
    white-space: nowrap;
  }

  .sd-stars {
    display: flex;
    gap: 0.25rem;
  }

  .sd-star {
    font-size: 1.6rem;
    background: none;
    border: none;
    cursor: pointer;
    color: #ddd;
    padding: 0;
    transition: color 0.15s, transform 0.15s;
    line-height: 1;
  }

  .sd-star.active {
    color: #f59e0b;
  }

  .sd-star:hover {
    transform: scale(1.2);
  }

  .sd-tottonoi-btns {
    display: flex;
    gap: 0.5rem;
  }

  .sd-tottonoi-btn {
    font-size: 1.5rem;
    background: none;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    padding: 0.3rem 0.5rem;
    cursor: pointer;
    opacity: 0.35;
    transition: all 0.15s;
  }

  .sd-tottonoi-btn.active {
    opacity: 1;
    border-color: #9c27b0;
    background: #f3e5f5;
  }

  /* View mode */
  .sd-info-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f0f0f0;
  }

  .sd-info-lbl {
    font-size: 0.8rem;
    font-weight: 600;
    color: #888;
    min-width: 60px;
  }

  .sd-info-val {
    font-size: 0.95rem;
    color: #333;
  }

  .sd-temps {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .sd-temp-chip {
    padding: 0.3rem 0.75rem;
    border-radius: 20px;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .sd-temp-sauna {
    background: #fff3e0;
    color: #e65100;
  }

  .sd-temp-water {
    background: #e3f2fd;
    color: #0d47a1;
  }

  .sd-stars-view {
    display: flex;
    gap: 0.1rem;
  }

  .sd-star-view {
    font-size: 1.2rem;
    color: #ddd;
  }

  .sd-star-view.active {
    color: #f59e0b;
  }

  .sd-tottonoi-view {
    display: flex;
    gap: 0.25rem;
  }

  .sd-tottonoi-view span {
    font-size: 1.2rem;
    opacity: 0.25;
  }

  .sd-tottonoi-view span.active {
    opacity: 1;
  }

  .sd-comment-view {
    background: #f9f9f9;
    border-radius: 8px;
    padding: 0.75rem;
  }

  .sd-comment-view p {
    margin: 0;
    font-size: 0.95rem;
    color: #444;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .sd-url-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #1565c0;
    text-decoration: none;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .sd-url-link:hover {
    text-decoration: underline;
  }

  .sd-empty-hint {
    margin: 0;
    font-size: 0.9rem;
    color: #aaa;
    text-align: center;
    padding: 1rem 0;
  }

  /* Actions */
  .sd-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid #f0f0f0;
    justify-content: flex-end;
  }

  .sd-confirm-text {
    font-size: 0.9rem;
    color: #c62828;
    font-weight: 600;
    margin-right: auto;
  }

  .sd-btn {
    padding: 0.55rem 1.1rem;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    font-size: 0.9rem;
    font-family: inherit;
    transition: all 0.2s;
  }

  .sd-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sd-btn-primary {
    background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
    color: white;
  }

  .sd-btn-primary:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
    transform: translateY(-1px);
  }

  .sd-btn-secondary {
    background: #f0f0f0;
    color: #333;
  }

  .sd-btn-secondary:hover:not(:disabled) {
    background: #e0e0e0;
  }

  .sd-btn-visit {
    background: linear-gradient(135deg, #2e7d32 0%, #43a047 100%);
    color: white;
  }

  .sd-btn-visit:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(46, 125, 50, 0.4);
    transform: translateY(-1px);
  }

  .sd-btn-danger {
    background: #e53935;
    color: white;
  }

  .sd-btn-danger:hover:not(:disabled) {
    background: #c62828;
  }

  .sd-btn-danger-outline {
    background: white;
    color: #e53935;
    border: 2px solid #e53935;
  }

  .sd-btn-danger-outline:hover:not(:disabled) {
    background: #ffebee;
  }
</style>
