<script lang="ts">
  import { browser } from "$app/environment";
  import type { Step } from "@tabitabi/types";
  import { getStepDate, getStepEndTime, getStepTime } from "@tabitabi/types";
  import { onDestroy } from "svelte";
  import { renderMarkdown } from "../utils/markdown";
  import IconRenderer from "../icons/IconRenderer.svelte";
  import { isTransportType } from "../utils/step-type";
  import "../styles/PrintPreviewView.css";

  type PrintLayout = "portrait" | "landscape";
  type DayGroup = {
    date: string;
    steps: Step[];
    dayIndex: number;
    weight: number;
  };

  interface Props {
    title: string;
    memo?: string | null;
    steps: Step[];
    seasonLabel: string;
    onPrint: () => void;
    onCancel: () => void;
  }

  let { title, memo = "", steps, seasonLabel, onPrint, onCancel }: Props = $props();
  let printLayout = $state<PrintLayout>("portrait");
  let pageStyleEl: HTMLStyleElement | null = null;

  const sortedSteps = $derived([...steps].sort((a, b) => a.start_at - b.start_at));

  const groupedSteps = $derived(() => {
    const groups = new Map<string, Step[]>();
    for (const step of sortedSteps) {
      const date = getStepDate(step);
      if (!groups.has(date)) groups.set(date, []);
      groups.get(date)!.push(step);
    }
    return Array.from(groups.entries());
  });

  const dayGroups = $derived(
    groupedSteps().map(([date, dateSteps], dayIndex) => ({
      date,
      steps: dateSteps,
      dayIndex,
      weight: estimateDayWeight(dateSteps),
    })),
  );

  const schedulePages = $derived(buildSchedulePages(dayGroups, printLayout));

  const travelDates = $derived(() => {
    const groups = groupedSteps();
    if (groups.length === 0) return "Schedule Preview";
    const first = new Date(`${groups[0][0]}T00:00:00`);
    const last = new Date(`${groups[groups.length - 1][0]}T00:00:00`);
    const formatter = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (groups.length === 1) return formatter.format(first);
    return `${formatter.format(first)} - ${formatter.format(last)}`;
  });

  function formatDate(dateStr: string): string {
    const date = new Date(`${dateStr}T00:00:00`);
    return date.toLocaleDateString("ja-JP", {
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  }

  function formatDayNumber(index: number): string {
    return String(index + 1).padStart(2, "0");
  }

  function getStepCountLabel(count: number): string {
    return `${count}件`;
  }

  function formatStepTime(step: Step): string {
    if (step.is_all_day) return "終日";
    const start = getStepTime(step);
    const end = getStepEndTime(step);
    return start === end ? start : `${start}-${end}`;
  }

  function estimateDayWeight(daySteps: Step[]): number {
    return daySteps.reduce((total, step) => {
      const noteWeight = Math.min((step.notes || "").length / 90, 1.8);
      return total + 1.3 + noteWeight;
    }, 2.4);
  }

  function getPageCapacity(layout: PrintLayout): number {
    return layout === "landscape" ? 23 : 17;
  }

  function buildSchedulePages(days: DayGroup[], layout: PrintLayout): DayGroup[][] {
    const pages: DayGroup[][] = [];
    const capacity = getPageCapacity(layout);
    let currentPage: DayGroup[] = [];
    let currentWeight = 0;

    for (const day of days) {
      const shouldStartNewPage =
        currentPage.length > 0 && currentWeight + day.weight > capacity;
      if (shouldStartNewPage) {
        pages.push(currentPage);
        currentPage = [];
        currentWeight = 0;
      }
      currentPage.push(day);
      currentWeight += day.weight;
    }

    if (currentPage.length > 0) pages.push(currentPage);
    return pages;
  }

  function handlePrint() {
    updatePageStyle();
    onPrint();
  }

  function updatePageStyle() {
    if (!browser) return;
    if (!pageStyleEl) {
      pageStyleEl = document.createElement("style");
      pageStyleEl.dataset.standardPrintPage = "true";
      document.head.appendChild(pageStyleEl);
    }
    const orientation = printLayout === "landscape" ? "landscape" : "portrait";
    pageStyleEl.textContent = `@media print { @page { size: A4 ${orientation}; margin: 0; } }`;
  }

  $effect(() => {
    updatePageStyle();
  });

  onDestroy(() => {
    pageStyleEl?.remove();
  });
</script>

<section
  class="standard-print-preview"
  class:standard-print-preview-landscape={printLayout === "landscape"}
  aria-label="印刷プレビュー"
>
  <div class="standard-print-preview-toolbar">
    <div>
      <p class="standard-print-preview-eyebrow">A4 SHIORI</p>
      <h2>印刷プレビュー</h2>
    </div>
    <div class="standard-print-preview-actions">
      <div class="standard-print-preview-layout" aria-label="用紙の向き">
        <button
          type="button"
          class:active={printLayout === "portrait"}
          aria-pressed={printLayout === "portrait"}
          onclick={() => (printLayout = "portrait")}
        >
          縦
        </button>
        <button
          type="button"
          class:active={printLayout === "landscape"}
          aria-pressed={printLayout === "landscape"}
          onclick={() => (printLayout = "landscape")}
        >
          横
        </button>
      </div>
      <button type="button" class="standard-print-preview-cancel" onclick={onCancel}>
        戻る
      </button>
      <button type="button" class="standard-print-preview-print" onclick={handlePrint}>
        印刷
      </button>
    </div>
  </div>

  <div class="standard-print-pages" aria-label={`${title}の印刷用しおり`}>
    <article class="standard-print-sheet standard-print-cover-sheet">
      <div class="standard-print-sheet-frame">
        <header class="standard-print-cover" aria-label="しおり表紙">
          <div class="standard-print-cover-meta">
            <span>{seasonLabel}</span>
            <span>{travelDates()}</span>
          </div>
          <p class="standard-print-cover-kicker">Travel Bookmark</p>
          <h1>{title}</h1>
          {#if renderMarkdown(memo || "")}
            <div class="standard-print-cover-memo">
              {@html renderMarkdown(memo || "")}
            </div>
          {/if}
        </header>
      </div>
    </article>

    {#if groupedSteps().length === 0}
      <article class="standard-print-sheet">
        <div class="standard-print-sheet-frame">
          <div class="standard-print-empty">予定がまだ登録されていません</div>
        </div>
      </article>
    {:else}
      {#each schedulePages as pageDays}
        <article class="standard-print-sheet standard-print-day-sheet">
          <div class="standard-print-sheet-frame">
            <main class="standard-print-days" aria-label="旅程">
              {#each pageDays as day}
                <section class="standard-print-day">
                  <div class="standard-print-day-heading">
                    <div>
                      <span class="standard-print-day-label">
                        DAY {formatDayNumber(day.dayIndex)}
                      </span>
                      <h2>{formatDate(day.date)}</h2>
                    </div>
                    <span class="standard-print-day-count">
                      {getStepCountLabel(day.steps.length)}
                    </span>
                  </div>

                  <div class="standard-print-timeline">
                    {#each day.steps as step}
                      <section
                        class="standard-print-step"
                        class:standard-print-step-transport={isTransportType(step.type)}
                      >
                        <div class="standard-print-step-time">
                          {formatStepTime(step)}
                        </div>
                        <div class="standard-print-step-marker">
                          <IconRenderer type={step.type} size="sm" />
                        </div>
                        <div class="standard-print-step-body">
                          <h3>{step.title}</h3>
                          {#if step.location}
                            <p class="standard-print-step-location">{step.location}</p>
                          {/if}
                          {#if renderMarkdown(step.notes)}
                            <div class="standard-print-step-notes">
                              {@html renderMarkdown(step.notes)}
                            </div>
                          {/if}
                        </div>
                      </section>
                    {/each}
                  </div>
                </section>
              {/each}
            </main>
          </div>
        </article>
      {/each}
    {/if}
  </div>

</section>
