<script lang="ts">
  import { browser } from "$app/environment";

  interface SearchResult {
    id: string;
    title: string;
    context: string;
  }

  interface Props {
    newStep: {
      title: string;
      date: string;
      time: string;
      location: string;
      notes: string;
    };
    newStepHour: string;
    newStepMinute: string;
    isEditing?: boolean;
    onSubmit: () => void;
    onCancel: () => void;
  }

  let {
    newStep = $bindable(),
    newStepHour = $bindable(),
    newStepMinute = $bindable(),
    isEditing = false,
    onSubmit,
    onCancel,
  }: Props = $props();

  let searchQuery = $state("");
  let suggestions = $state<SearchResult[]>([]);
  let isSearching = $state(false);
  let searchError = $state("");
  let lastQuery = "";

  $effect(() => {
    newStep.time = `${newStepHour}:${newStepMinute}`;
  });

  $effect(() => {
    searchQuery = newStep.location;
  });

  $effect(() => {
    const query = searchQuery.trim();
    if (!browser) return;
    if (!query) {
      suggestions = [];
      searchError = "";
      return;
    }

    if (query === lastQuery) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      isSearching = true;
      searchError = "";
      lastQuery = query;
      try {
        const res = await fetch(
          `/api/mapbox/geocode?query=${encodeURIComponent(query)}&limit=5`,
          { signal: controller.signal },
        );

        if (!res.ok) {
          throw new Error("検索に失敗しました");
        }

        const data = await res.json();
        suggestions = (data.features || []).map((feature: any) => ({
          id: feature.id,
          title: feature.text ?? feature.place_name,
          context: feature.place_name ?? "",
        }));
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Mapbox search failed", err);
        searchError = "検索に失敗しました";
      } finally {
        isSearching = false;
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  });

  function handleSubmit(e: Event) {
    e.preventDefault();
    onSubmit();
  }

  function handleSuggestionSelect(item: SearchResult) {
    newStep.location = item.context;
    searchQuery = item.context;
    suggestions = [];
  }

  function clearSuggestions() {
    suggestions = [];
    searchError = "";
  }
</script>

<form class="journey-form" onsubmit={handleSubmit}>
  <h3 class="form-title">
    {#if isEditing}
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path
          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        />
      </svg>
      スポットを編集
    {:else}
      <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
      </svg>
      新しいスポットを追加
    {/if}
  </h3>

  <div class="form-group">
    <label class="form-label" for="title">タイトル *</label>
    <input
      id="title"
      type="text"
      bind:value={newStep.title}
      placeholder="例: 東京タワー観光"
      class="form-input"
      required
    />
  </div>

  <div class="form-row">
    <div class="form-group flex-1">
      <label class="form-label" for="date">日付 *</label>
      <input
        id="date"
        type="date"
        bind:value={newStep.date}
        class="form-input"
        required
      />
    </div>
    <div class="form-group time-group">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <label class="form-label">時刻 *</label>
      <div class="time-picker">
        <select bind:value={newStepHour} class="time-select">
          {#each Array.from( { length: 24 }, (_, i) => String(i).padStart(2, "0"), ) as hour}
            <option value={hour}>{hour}</option>
          {/each}
        </select>
        <span class="time-separator">:</span>
        <select bind:value={newStepMinute} class="time-select">
          <option value="00">00</option>
          <option value="15">15</option>
          <option value="30">30</option>
          <option value="45">45</option>
        </select>
      </div>
    </div>
  </div>

  <div class="form-group">
    <label class="form-label" for="location">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
        <path
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
        />
      </svg>
      場所
    </label>
    <input
      id="location"
      type="text"
      bind:value={newStep.location}
      oninput={() => (searchQuery = newStep.location)}
      placeholder="例: 東京タワー、港区"
      class="form-input"
    />
    <span class="form-hint">Mapboxで検索して位置を合わせられます</span>

    {#if isSearching}
      <div class="search-status">検索中...</div>
    {:else if searchError}
      <div class="search-status error">{searchError}</div>
    {:else if suggestions.length > 0}
      <div class="suggestions">
        {#each suggestions as item}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div class="suggestion" onclick={() => handleSuggestionSelect(item)}>
            <div class="suggestion-title">{item.title}</div>
            <div class="suggestion-context">{item.context}</div>
          </div>
        {/each}
        <button
          type="button"
          class="clear-suggestions"
          onclick={clearSuggestions}
        >
          候補を閉じる
        </button>
      </div>
    {/if}
  </div>

  <div class="form-group">
    <label class="form-label" for="notes">
      <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
        <path
          d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
        />
      </svg>
      メモ
    </label>
    <textarea
      id="notes"
      bind:value={newStep.notes}
      placeholder="追加情報を入力..."
      class="form-textarea"
      rows="3"
    ></textarea>
  </div>

  <div class="form-actions">
    <button type="submit" class="submit-btn">
      {isEditing ? "変更を保存" : "スポットを追加"}
    </button>
    <button type="button" onclick={onCancel} class="cancel-btn">
      キャンセル
    </button>
  </div>
</form>

<style>
  .journey-form {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .form-title {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.25rem;
    font-weight: 700;
    color: #f1f5f9;
    margin: 0;
  }

  .form-title svg {
    color: #8b5cf6;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-row {
    display: flex;
    gap: 12px;
  }

  .flex-1 {
    flex: 1;
  }

  .time-group {
    flex-shrink: 0;
  }

  .form-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .form-label svg {
    color: #8b5cf6;
  }

  .form-input {
    width: 100%;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    font-size: 15px;
    color: #f1f5f9;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .form-input::placeholder {
    color: #64748b;
  }

  .form-input:focus {
    outline: none;
    border-color: #8b5cf6;
    background: rgba(139, 92, 246, 0.1);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
  }

  .form-textarea {
    width: 100%;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    font-size: 15px;
    color: #f1f5f9;
    resize: vertical;
    min-height: 80px;
    font-family: inherit;
    transition: all 0.2s ease;
    box-sizing: border-box;
  }

  .form-textarea::placeholder {
    color: #64748b;
  }

  .form-textarea:focus {
    outline: none;
    border-color: #8b5cf6;
    background: rgba(139, 92, 246, 0.1);
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
  }

  .form-hint {
    font-size: 12px;
    color: #64748b;
    margin-top: -4px;
  }

  .suggestions {
    margin-top: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.35);
    max-height: 300px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }

  .suggestions::-webkit-scrollbar {
    width: 6px;
  }

  .suggestions::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.03);
  }

  .suggestions::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.5);
    border-radius: 3px;
  }

  .suggestions::-webkit-scrollbar-thumb:hover {
    background: rgba(139, 92, 246, 0.8);
  }

  .suggestion {
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    cursor: pointer;
    transition: background 0.15s ease;
    flex-shrink: 0;
  }

  .suggestion:hover {
    background: rgba(139, 92, 246, 0.12);
  }

  .suggestion:last-of-type {
    border-bottom: none;
  }

  .suggestion-title {
    font-size: 14px;
    font-weight: 700;
    color: #f8fafc;
    margin-bottom: 4px;
  }

  .suggestion-context {
    font-size: 12px;
    color: #cbd5e1;
    line-height: 1.4;
  }

  .clear-suggestions {
    width: 100%;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.03);
    color: #94a3b8;
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    cursor: pointer;
    font-size: 12px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  .clear-suggestions:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #e2e8f0;
  }

  .search-status {
    margin-top: 8px;
    font-size: 12px;
    color: #cbd5e1;
  }

  .search-status.error {
    color: #fca5a5;
  }

  .time-picker {
    display: flex;
    align-items: center;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 4px 8px;
    gap: 4px;
  }

  .time-select {
    background: transparent;
    border: none;
    color: #f1f5f9;
    font-size: 16px;
    font-weight: 600;
    padding: 10px 4px;
    cursor: pointer;
    outline: none;
    appearance: none;
  }

  .time-select option {
    background: #1e1b4b;
    color: #f1f5f9;
  }

  .time-separator {
    color: #8b5cf6;
    font-weight: 700;
    font-size: 18px;
  }

  .form-actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 8px;
  }

  .submit-btn {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  .submit-btn:hover {
    background: linear-gradient(135deg, #7c3aed, #6d28d9);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
  }

  .submit-btn:active {
    transform: translateY(0);
  }

  .cancel-btn {
    width: 100%;
    padding: 14px;
    background: rgba(255, 255, 255, 0.05);
    color: #94a3b8;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .cancel-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f1f5f9;
  }
</style>
