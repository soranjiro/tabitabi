<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import SaunaDetailDialog from "./SaunaDetailDialog.svelte";
  import TotonoiMeter from "./TotonoiMeter.svelte";

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

  let {
    steps,
    hasEditPermission,
    isViewMode,
    onAddSauna,
    onUpdateStep,
    onDeleteStep,
  }: Props = $props();

  let currentYear = $state(new Date().getFullYear());
  let currentMonth = $state(new Date().getMonth()); // 0-indexed
  let selectedStepId = $state<string | null>(null);
  let showDetail = $state(false);
  let selectedDate = $state<string | null>(null);

  // Always derive the latest step data from steps prop
  const selectedStep = $derived(
    selectedStepId ? (steps.find((s) => s.id === selectedStepId) ?? null) : null,
  );

  const DOW_LABELS = ["月", "火", "水", "木", "金", "土", "日"];
  const TODAY = new Date().toISOString().split("T")[0];

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

  // date string → visited steps on that date
  const visitedByDate = $derived.by(() => {
    const map = new Map<string, Step[]>();
    for (const step of steps) {
      const data = parseSaunaData(step.notes);
      if (data.visited && data.visit_date) {
        const list = map.get(data.visit_date) ?? [];
        list.push(step);
        map.set(data.visit_date, list);
      }
    }
    return map;
  });

  // Calendar grid days
  const calendarDays = $derived.by(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Week starts Monday: Sun=0 becomes 7
    let startDow = firstDay.getDay();
    if (startDow === 0) startDow = 7;
    const offset = startDow - 1; // Mon=0

    const days: Array<{ day: number | null; dateStr: string | null }> = [];

    for (let i = 0; i < offset; i++) {
      days.push({ day: null, dateStr: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const m = String(currentMonth + 1).padStart(2, "0");
      const dd = String(d).padStart(2, "0");
      days.push({ day: d, dateStr: `${currentYear}-${m}-${dd}` });
    }
    const rem = days.length % 7;
    if (rem > 0) {
      for (let i = 0; i < 7 - rem; i++) {
        days.push({ day: null, dateStr: null });
      }
    }
    return days;
  });

  const visitedSteps = $derived(
    steps.filter((s) => parseSaunaData(s.notes).visited),
  );

  const avgRating = $derived.by(() => {
    const rated = steps
      .map((s) => parseSaunaData(s.notes).rating)
      .filter((r): r is number => r != null && r > 0);
    if (rated.length === 0) return 0;
    return rated.reduce((a, b) => a + b, 0) / rated.length;
  });

  const avgTottonoi = $derived.by(() => {
    const levels = steps
      .map((s) => parseSaunaData(s.notes).tottonoi_level)
      .filter((l): l is number => l != null && l > 0);
    if (levels.length === 0) return 0;
    return levels.reduce((a, b) => a + b, 0) / levels.length;
  });

  const sortedSteps = $derived(
    [...steps].sort((a, b) => {
      const ad = parseSaunaData(a.notes);
      const bd = parseSaunaData(b.notes);
      // Visited first, then by title
      if (ad.visited && !bd.visited) return -1;
      if (!ad.visited && bd.visited) return 1;
      return a.title.localeCompare(b.title, "ja");
    }),
  );

  function prevMonth() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
  }

  function openDetail(stepId: string) {
    selectedStepId = stepId;
    showDetail = true;
  }

  function handleDayClick(dateStr: string | null) {
    if (!dateStr) return;
    const visited = visitedByDate.get(dateStr);
    if (visited && visited.length > 0) {
      // If only one sauna visited that day, open directly
      if (visited.length === 1) {
        openDetail(visited[0].id);
        return;
      }
    }
    // Select the date (highlight it and filter the list below)
    selectedDate = selectedDate === dateStr ? null : dateStr;
  }

  // Steps shown in the list (filtered by selectedDate if set)
  const displayedSteps = $derived.by(() => {
    if (!selectedDate) return sortedSteps;
    const visited = visitedByDate.get(selectedDate);
    const visitedIds = new Set(visited?.map((s) => s.id) ?? []);
    if (visitedIds.size === 0) return sortedSteps;
    // Put visited-on-date steps first
    return [
      ...sortedSteps.filter((s) => visitedIds.has(s.id)),
      ...sortedSteps.filter((s) => !visitedIds.has(s.id)),
    ];
  });
</script>

<div class="cv-container">
  <!-- Stats / Tottonoi Meter -->
  <TotonoiMeter
    visited={visitedSteps.length}
    total={steps.length}
    {avgRating}
    {avgTottonoi}
  />

  <!-- Calendar card -->
  <div class="cv-card">
    <div class="cv-nav">
      <button class="cv-nav-btn" onclick={prevMonth}>‹</button>
      <span class="cv-month-label"
        >{currentYear}年{currentMonth + 1}月</span
      >
      <button class="cv-nav-btn" onclick={nextMonth}>›</button>
    </div>

    <div class="cv-grid">
      {#each DOW_LABELS as dow, i}
        <div class="cv-dow" class:weekend={i >= 5}>{dow}</div>
      {/each}

      {#each calendarDays as { day, dateStr }}
        {@const visits = dateStr ? visitedByDate.get(dateStr) : null}
        {@const isToday = dateStr === TODAY}
        {@const hasVisit = visits != null && visits.length > 0}
        {@const isSelected = dateStr === selectedDate}
        <button
          class="cv-day"
          class:empty={!day}
          class:today={isToday}
          class:has-visit={hasVisit}
          class:selected={isSelected}
          onclick={() => handleDayClick(dateStr)}
          disabled={!day}
        >
          {#if day}
            <span class="cv-day-num">{day}</span>
            {#if hasVisit}
              <span class="cv-stamp">🔥</span>
              {#if visits && visits.length > 1}
                <span class="cv-extra">+{visits.length - 1}</span>
              {/if}
            {/if}
          {/if}
        </button>
      {/each}
    </div>
  </div>

  <!-- Sauna list -->
  <div class="cv-list-section">
    {#if steps.length === 0}
      <div class="cv-empty">
        <div class="cv-empty-icon">🏕️</div>
        <p>サウナ施設を追加しましょう！</p>
        {#if hasEditPermission && onAddSauna}
          <button class="cv-add-btn" onclick={() => onAddSauna?.()}>
            + サウナを追加
          </button>
        {/if}
      </div>
    {:else}
      <div class="cv-list-header">
        <h3 class="cv-list-title">
          🏕️ サウナリスト
          {#if selectedDate}
            <span class="cv-date-filter-badge">{selectedDate}</span>
          {/if}
        </h3>
        <div class="cv-list-header-actions">
          {#if selectedDate}
            <button class="cv-clear-date-btn" onclick={() => (selectedDate = null)}>✕ 絞り込み解除</button>
          {/if}
          {#if hasEditPermission && !isViewMode && onAddSauna}
            <button class="cv-add-btn-sm" onclick={() => onAddSauna?.()}>
              + 追加
            </button>
          {/if}
        </div>
      </div>

      <div class="cv-cards">
        {#each displayedSteps as step (step.id)}
          {@const data = parseSaunaData(step.notes)}
          <button
            class="cv-sauna-card"
            class:visited={data.visited}
            onclick={() => openDetail(step.id)}
          >
            <span class="cv-card-stamp">{data.visited ? "🔥" : "💧"}</span>
            <div class="cv-card-body">
              <div class="cv-card-name">{step.title}</div>
              {#if data.visited && data.visit_date}
                <div class="cv-card-date">{data.visit_date}</div>
              {/if}
              {#if data.rating}
                <div class="cv-card-rating">
                  {#each [1, 2, 3, 4, 5] as s}
                    <span class:active={data.rating >= s}>★</span>
                  {/each}
                </div>
              {/if}
            </div>
            <div class="cv-card-chips">
              {#if data.sauna_temp}
                <span class="cv-chip cv-chip-sauna">🔥{data.sauna_temp}°</span>
              {/if}
              {#if data.water_temp}
                <span class="cv-chip cv-chip-water">❄️{data.water_temp}°</span>
              {/if}
              {#if data.tottonoi_level}
                <span class="cv-chip cv-chip-tottonoi"
                  >🤯{data.tottonoi_level}</span
                >
              {/if}
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<SaunaDetailDialog
  show={showDetail}
  step={selectedStep}
  {hasEditPermission}
  {isViewMode}
  onUpdate={onUpdateStep}
  onDelete={onDeleteStep}
  onClose={() => {
    showDetail = false;
    selectedStepId = null;
  }}
/>

<style>
  .cv-container {
    max-width: 640px;
    margin: 0 auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Calendar card */
  .cv-card {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .cv-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%);
  }

  .cv-nav-btn {
    background: rgba(255, 255, 255, 0.25);
    border: none;
    color: white;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    font-size: 1.4rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;
    line-height: 1;
  }

  .cv-nav-btn:hover {
    background: rgba(255, 255, 255, 0.4);
  }

  .cv-month-label {
    font-size: 1.15rem;
    font-weight: 700;
    color: white;
  }

  .cv-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
    background: #f0f0f0;
    padding: 0 0.5rem 0.75rem;
  }

  .cv-dow {
    text-align: center;
    padding: 0.6rem 0 0.4rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: #888;
    background: white;
  }

  .cv-dow.weekend {
    color: #e53935;
  }

  .cv-day {
    background: white;
    border: none;
    min-height: 56px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 0.35rem 0.2rem 0.25rem;
    cursor: default;
    position: relative;
    transition: background 0.15s;
    gap: 1px;
  }

  .cv-day.empty {
    background: #fafafa;
  }

  .cv-day.today .cv-day-num {
    background: #ff6b35;
    color: white;
    border-radius: 50%;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cv-day.has-visit {
    cursor: pointer;
    background: #fff8f0;
  }

  .cv-day.has-visit:hover {
    background: #ffe5cc;
  }

  .cv-day.selected {
    background: #fff0e8;
    outline: 2px solid #ff6b35;
    outline-offset: -2px;
    z-index: 1;
  }

  .cv-day-num {
    font-size: 0.8rem;
    color: #333;
    line-height: 1;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cv-stamp {
    font-size: 1.1rem;
    line-height: 1;
    animation: stamp-in 0.4s ease-out;
  }

  @keyframes stamp-in {
    from {
      transform: scale(0) rotate(-30deg);
      opacity: 0;
    }
    60% {
      transform: scale(1.15) rotate(5deg);
    }
    to {
      transform: scale(1) rotate(0);
      opacity: 1;
    }
  }

  .cv-extra {
    font-size: 0.6rem;
    color: #ff6b35;
    font-weight: 700;
    line-height: 1;
  }

  /* Sauna list */
  .cv-list-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .cv-empty {
    background: rgba(255, 255, 255, 0.85);
    border-radius: 16px;
    padding: 2.5rem 1.5rem;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .cv-empty-icon {
    font-size: 3rem;
    opacity: 0.5;
  }

  .cv-empty p {
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 600;
  }

  .cv-add-btn {
    padding: 0.65rem 1.5rem;
    background: white;
    color: #ff6b35;
    border: none;
    border-radius: 10px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .cv-add-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  .cv-list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .cv-list-title {
    margin: 0;
    font-size: 1rem;
    color: white;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .cv-date-filter-badge {
    font-size: 0.75rem;
    background: rgba(255, 255, 255, 0.25);
    color: white;
    padding: 0.15rem 0.5rem;
    border-radius: 10px;
    font-weight: 600;
  }

  .cv-list-header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cv-clear-date-btn {
    padding: 0.3rem 0.65rem;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cv-clear-date-btn:hover {
    background: rgba(255, 255, 255, 0.35);
  }

  .cv-add-btn-sm {
    padding: 0.4rem 0.9rem;
    background: rgba(255, 255, 255, 0.9);
    color: #ff6b35;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cv-add-btn-sm:hover {
    background: white;
  }

  .cv-cards {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .cv-sauna-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    background: rgba(255, 255, 255, 0.88);
    border-radius: 14px;
    border: 2px solid transparent;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
    width: 100%;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  .cv-sauna-card:hover {
    background: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }

  .cv-sauna-card.visited {
    border-color: rgba(76, 175, 80, 0.5);
    background: rgba(232, 245, 233, 0.9);
  }

  .cv-sauna-card.visited:hover {
    background: #e8f5e9;
  }

  .cv-card-stamp {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .cv-card-body {
    flex: 1;
    min-width: 0;
  }

  .cv-card-name {
    font-size: 0.95rem;
    font-weight: 700;
    color: #2c3e50;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .cv-card-date {
    font-size: 0.75rem;
    color: #4caf50;
    font-weight: 600;
    margin-top: 0.15rem;
  }

  .cv-card-rating {
    display: flex;
    gap: 1px;
    margin-top: 0.2rem;
  }

  .cv-card-rating span {
    font-size: 0.75rem;
    color: #ddd;
  }

  .cv-card-rating span.active {
    color: #f59e0b;
  }

  .cv-card-chips {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex-shrink: 0;
  }

  .cv-chip {
    font-size: 0.72rem;
    font-weight: 600;
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
    white-space: nowrap;
  }

  .cv-chip-sauna {
    background: #fff3e0;
    color: #e65100;
  }

  .cv-chip-water {
    background: #e3f2fd;
    color: #0d47a1;
  }

  .cv-chip-tottonoi {
    background: #f3e5f5;
    color: #6a1b9a;
  }

  @media (max-width: 480px) {
    .cv-container {
      padding: 0.75rem;
    }

    .cv-day {
      min-height: 46px;
    }

    .cv-stamp {
      font-size: 0.95rem;
    }
  }
</style>
