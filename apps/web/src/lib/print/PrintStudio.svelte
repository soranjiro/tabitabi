<script lang="ts">
  import { browser } from "$app/environment";
  import type { ItineraryResponse, Step } from "@tabitabi/types";
  import { getMemoText } from "$lib/memo";
  import { onDestroy, onMount } from "svelte";
  import {
    PRINT_TEMPLATES,
    buildTimelinePages,
    buildWeekPages,
    formatPrintDate,
    formatPrintTime,
    getTemplateAvailability,
    getTravelDateLabel,
    groupStepsByDay,
    type PrintTemplateId,
  } from "./model";
  import "./print.css";

  interface Props {
    itinerary: ItineraryResponse;
    steps: Step[];
  }

  let { itinerary, steps }: Props = $props();
  let open = $state(false);
  let selectedTemplate = $state<PrintTemplateId>("week");
  let viewportWidth = $state(1280);
  let pageStyle: HTMLStyleElement | null = null;

  const days = $derived(groupStepsByDay(steps));
  const weekPages = $derived(buildWeekPages(days));
  const timelinePages = $derived(buildTimelinePages(days));
  const currentTemplate = $derived(
    PRINT_TEMPLATES.find((template) => template.id === selectedTemplate)!,
  );
  const previewScale = $derived(
    Math.min(
      1,
      Math.max(viewportWidth - 24, 280) /
        (currentTemplate.orientation === "landscape" ? 1122 : 794),
    ),
  );
  const pageWidth = $derived(
    (currentTemplate.orientation === "landscape" ? 1122 : 794) * previewScale,
  );
  const pageHeight = $derived(
    (currentTemplate.orientation === "landscape" ? 794 : 1122) * previewScale,
  );
  const memoText = $derived(getMemoText(itinerary.memo));

  function selectTemplate(templateId: PrintTemplateId) {
    if (!getTemplateAvailability(templateId, days, memoText).available) return;
    selectedTemplate = templateId;
  }

  function updatePageStyle() {
    if (!browser) return;
    if (!pageStyle) {
      pageStyle = document.createElement("style");
      pageStyle.dataset.tabitabiPrintPage = "true";
      document.head.appendChild(pageStyle);
    }
    pageStyle.textContent = `@media print { @page { size: A4 ${currentTemplate.orientation}; margin: 0; } }`;
  }

  function openStudio() {
    open = true;
    document.documentElement.classList.add("tabitabi-print-open");
  }

  function closeStudio() {
    open = false;
    document.documentElement.classList.remove("tabitabi-print-open");
  }

  function printOrSavePdf() {
    updatePageStyle();
    window.print();
  }

  function getTypeMark(step: Step): string {
    if (step.type?.includes("plane")) return "✈";
    if (step.type?.includes("train")) return "↗";
    if (step.type?.includes("car") || step.type?.includes("bus")) return "→";
    if (step.type?.includes("hotel")) return "◇";
    if (step.type?.includes("food") || step.type?.includes("meal")) return "●";
    return "•";
  }

  $effect(() => {
    if (open) updatePageStyle();
  });

  onMount(() => {
    const resize = () => (viewportWidth = window.innerWidth);
    const openFromTheme = () => openStudio();
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("tabitabi:open-print", openFromTheme);
    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("tabitabi:open-print", openFromTheme);
    };
  });

  onDestroy(() => {
    pageStyle?.remove();
    document.documentElement.classList.remove("tabitabi-print-open");
  });
</script>

<button
  type="button"
  class="print-studio-launcher"
  onclick={openStudio}
  aria-label="印刷・PDF出力を開く"
>
  <span aria-hidden="true">▤</span>
  <span>印刷・PDF</span>
</button>

{#if open}
  <section class="print-studio" aria-label="印刷・PDF出力">
    <header class="print-studio-toolbar">
      <div class="print-studio-heading">
        <p>PRINT STUDIO</p>
        <h2>旅のかたちを選ぶ</h2>
      </div>

      <div class="print-studio-template-list" aria-label="デザイン">
        {#each PRINT_TEMPLATES as template}
          {@const availability = getTemplateAvailability(template.id, days, memoText)}
          <button
            type="button"
            class="print-studio-template"
            class:active={selectedTemplate === template.id}
            disabled={!availability.available}
            onclick={() => selectTemplate(template.id)}
            aria-pressed={selectedTemplate === template.id}
            title={availability.reason ?? template.description}
          >
            <span class="print-studio-template-badge">{template.badge}</span>
            <strong>{template.name}</strong>
            <small>{availability.reason ?? template.description}</small>
          </button>
        {/each}
      </div>

      <div class="print-studio-actions">
        <div class="print-studio-output-note">
          <strong>A4 {currentTemplate.orientation === "landscape" ? "横" : "縦"}</strong>
          <span>PDFは印刷画面で「PDFに保存」を選択</span>
        </div>
        <button type="button" class="print-studio-back" onclick={closeStudio}>戻る</button>
        <button type="button" class="print-studio-print" onclick={printOrSavePdf}>
          印刷 / PDF保存
        </button>
      </div>
    </header>

    <div
      class="print-studio-pages"
      class:landscape={currentTemplate.orientation === "landscape"}
      style={`--print-scale:${previewScale};--print-shell-width:${pageWidth}px;--print-shell-height:${pageHeight}px`}
      aria-live="polite"
    >
      {#if selectedTemplate === "week"}
        {#if weekPages.length === 0}
          <div class="print-studio-sheet-shell">
            <article class="print-studio-sheet week-sheet empty-sheet">
              <p>予定がまだ登録されていません</p>
            </article>
          </div>
        {:else}
          {#each weekPages as page, pageIndex}
            <div class="print-studio-sheet-shell">
              <article class="print-studio-sheet week-sheet">
                <header class="week-header">
                  <div>
                    <p>WEEKLY JOURNEY</p>
                    <h1>{itinerary.title}</h1>
                  </div>
                  <div class="week-meta">
                    <span>{formatPrintDate(page.weekStart, true)}から</span>
                    <strong>{pageIndex + 1} / {weekPages.length}</strong>
                    {#if page.continuation > 0}<em>続き {page.continuation + 1}</em>{/if}
                  </div>
                </header>
                <main class="week-grid">
                  {#each page.days as day}
                    <section class="week-day" class:weekend={new Date(`${day.date}T00:00:00`).getDay() % 6 === 0}>
                      <header>
                        <span>{new Date(`${day.date}T00:00:00`).toLocaleDateString("en", { weekday: "short" })}</span>
                        <strong>{new Date(`${day.date}T00:00:00`).getDate()}</strong>
                        {#if day.continuation && day.steps.length > 0}<small>CONT.</small>{/if}
                      </header>
                      <div class="week-events">
                        {#each day.steps as step}
                          <div class="week-event">
                            <time>{formatPrintTime(step)}</time>
                            <i>{getTypeMark(step)}</i>
                            <div>
                              <h2>{step.title}</h2>
                              {#if step.location}<p>{step.location}</p>{/if}
                            </div>
                          </div>
                        {/each}
                      </div>
                    </section>
                  {/each}
                </main>
                <footer class="week-footer">
                  <span>TABITABI TRAVEL PLANNER</span>
                  <span>{getTravelDateLabel(days)}</span>
                </footer>
              </article>
            </div>
          {/each}
        {/if}
      {:else if selectedTemplate === "editorial"}
        <div class="print-studio-sheet-shell">
          <article class="print-studio-sheet editorial-sheet editorial-cover">
            <div class="editorial-cover-number">{String(days.length).padStart(2, "0")}</div>
            <div class="editorial-cover-line"></div>
            <p class="editorial-kicker">A PERSONAL TRAVEL BOOK</p>
            <h1>{itinerary.title}</h1>
            <div class="editorial-date">{getTravelDateLabel(days)}</div>
            {#if memoText}<p class="editorial-intro">{memoText}</p>{/if}
            <footer>
              <span>made for the moments between destinations</span>
              <strong>旅のしおり</strong>
            </footer>
          </article>
        </div>
        {#each days as day}
          <div class="print-studio-sheet-shell">
            <article class="print-studio-sheet editorial-sheet editorial-day">
              <header>
                <div class="editorial-day-index">DAY {String(day.dayIndex + 1).padStart(2, "0")}</div>
                <h1>{formatPrintDate(day.date)}</h1>
                <p>{day.steps.length} PLACES & MOMENTS</p>
              </header>
              <main>
                {#each day.steps as step, stepIndex}
                  <section class="editorial-event">
                    <div class="editorial-event-number">{String(stepIndex + 1).padStart(2, "0")}</div>
                    <time>{formatPrintTime(step)}</time>
                    <div>
                      <h2>{step.title}</h2>
                      {#if step.location}<p class="editorial-location">⌖ {step.location}</p>{/if}
                      {#if step.notes}<p class="editorial-notes">{getMemoText(step.notes)}</p>{/if}
                    </div>
                  </section>
                {/each}
              </main>
              <footer>
                <span>{itinerary.title}</span>
                <strong>{String(day.dayIndex + 2).padStart(2, "0")}</strong>
              </footer>
            </article>
          </div>
        {/each}
      {:else}
        <div class="print-studio-sheet-shell">
          <article class="print-studio-sheet timeline-sheet timeline-cover">
            <p>TRAVEL ITINERARY / {new Date().getFullYear()}</p>
            <h1>{itinerary.title}</h1>
            <div class="timeline-cover-date">{getTravelDateLabel(days)}</div>
            {#if memoText}<p class="timeline-cover-memo">{memoText}</p>{/if}
            <div class="timeline-cover-rule"></div>
            <footer>PLAN · GO · REMEMBER</footer>
          </article>
        </div>
        {#each timelinePages as page, pageIndex}
          <div class="print-studio-sheet-shell">
            <article class="print-studio-sheet timeline-sheet">
              <header class="timeline-header">
                <div>
                  <p>ITINERARY DETAILS</p>
                  <h1>{itinerary.title}</h1>
                </div>
                <strong>{String(pageIndex + 2).padStart(2, "0")}</strong>
              </header>
              <main class="timeline-days">
                {#each page as day}
                  <section class="timeline-day">
                    <header>
                      <span>DAY {String(day.dayIndex + 1).padStart(2, "0")}{day.continuation ? " / CONT." : ""}</span>
                      <h2>{formatPrintDate(day.date)}</h2>
                    </header>
                    <div>
                      {#each day.steps as step}
                        <section class="timeline-event">
                          <time>{formatPrintTime(step)}</time>
                          <i>{getTypeMark(step)}</i>
                          <div>
                            <h3>{step.title}</h3>
                            {#if step.location}<p class="timeline-location">{step.location}</p>{/if}
                            {#if step.notes}<p class="timeline-notes">{getMemoText(step.notes)}</p>{/if}
                          </div>
                        </section>
                      {/each}
                    </div>
                  </section>
                {/each}
              </main>
            </article>
          </div>
        {/each}
      {/if}
    </div>
  </section>
{/if}
