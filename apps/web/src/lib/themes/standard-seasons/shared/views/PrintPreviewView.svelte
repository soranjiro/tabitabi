<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getStepDate, getStepTime } from "@tabitabi/types";
  import { renderMarkdown } from "../utils/markdown";
  import IconRenderer from "../icons/IconRenderer.svelte";
  import { isTransportType } from "../utils/step-type";
  import "../styles/PrintPreviewView.css";

  interface Props {
    title: string;
    memo?: string | null;
    steps: Step[];
    seasonLabel: string;
    onPrint: () => void;
    onCancel: () => void;
  }

  let { title, memo = "", steps, seasonLabel, onPrint, onCancel }: Props = $props();

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
    return `${count} ${count === 1 ? "plan" : "plans"}`;
  }
</script>

<section class="standard-print-preview" aria-label="印刷プレビュー">
  <div class="standard-print-preview-toolbar">
    <div>
      <p class="standard-print-preview-eyebrow">PRINT PREVIEW</p>
      <h2>このデザインでPDF/印刷します</h2>
      <p>内容を確認して、印刷するかキャンセルを選んでください。</p>
    </div>
    <div class="standard-print-preview-actions">
      <button type="button" class="standard-print-preview-cancel" onclick={onCancel}>
        キャンセル
      </button>
      <button type="button" class="standard-print-preview-print" onclick={onPrint}>
        印刷・PDF出力
      </button>
    </div>
  </div>

  <article class="standard-print-sheet">
    <div class="standard-print-sheet-frame">
      <header class="standard-print-cover">
        <div class="standard-print-cover-meta">
          <span>{seasonLabel}</span>
          <span>{travelDates()}</span>
        </div>
        <p class="standard-print-cover-kicker">Travel Itinerary</p>
        <h1>{title}</h1>
        {#if renderMarkdown(memo || "")}
          <div class="standard-print-cover-memo">
            {@html renderMarkdown(memo || "")}
          </div>
        {:else}
          <p class="standard-print-cover-subtitle">
            大切な予定を一枚のしおりにまとめました。
          </p>
        {/if}
      </header>

      {#if groupedSteps().length === 0}
        <div class="standard-print-empty">予定がまだ登録されていません</div>
      {:else}
        <div class="standard-print-days">
          {#each groupedSteps() as [date, dateSteps], dayIndex}
            <section class="standard-print-day-card">
              <div class="standard-print-day-heading">
                <div>
                  <span class="standard-print-day-label">DAY {formatDayNumber(dayIndex)}</span>
                  <h2>{formatDate(date)}</h2>
                </div>
                <span class="standard-print-day-count">{getStepCountLabel(dateSteps.length)}</span>
              </div>

              <div class="standard-print-timeline">
                {#each dateSteps as step}
                  <div class="standard-print-step" class:standard-print-step-transport={isTransportType(step.type)}>
                    <div class="standard-print-step-time">
                      {#if step.is_all_day}
                        終日
                      {:else}
                        {getStepTime(step)}
                      {/if}
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
                  </div>
                {/each}
              </div>
            </section>
          {/each}
        </div>
      {/if}
    </div>
  </article>
</section>
