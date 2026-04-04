<script lang="ts">
  import "./styles/index.css";
  import type { PreviewItinerary } from "../previewData/types";
  import CardPreview from "./views/CardPreview.svelte";
  import ListPreview from "./views/ListPreview.svelte";
  import TimelinePreview from "./views/TimelinePreview.svelte";
  import WeekPreview from "./views/WeekPreview.svelte";
  import MonthPreview from "./views/MonthPreview.svelte";
  import ShoppingPreview from "./views/ShoppingPreview.svelte";
  import PixelQuestPreview from "./views/PixelQuestPreview.svelte";
  import MapOnlyPreview from "./views/MapOnlyPreview.svelte";
  import MapboxJourneyPreview from "./views/MapboxJourneyPreview.svelte";
  import ComingSoonPreview from "./views/ComingSoonPreview.svelte";
  import AiGeneratedPreview from "./views/AiGeneratedPreview.svelte";

  export let previews: PreviewItinerary[];
  export let currentIndex: number;
  export let onSelect: (index: number) => void;
  export let onTryDemo: (() => void) | undefined;

  function getDateDisplay(): string {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
    const weekday = weekdays[today.getDay()];
    return `${today.getFullYear()}年${month}月${day}日(${weekday})`;
  }
</script>

<div class="hero-visual">
  <div class="preview-carousel">
    {#each previews as preview, i}
      <div
        class="preview-card {preview.layout} theme-{preview.themeId} {i ===
        currentIndex
          ? 'active'
          : i === (currentIndex + 1) % previews.length
            ? 'next'
            : 'prev'}"
        style="--bg: {preview.colors.background}; --text: {preview.colors
          .text}; --primary: {preview.colors.primary}; --accent: {preview.colors
          .accent}; --secondary: {preview.colors.secondary}; --border: {preview
          .colors.border || '#e5e7eb'};"
      >
        <div
          class="preview-header"
          style="background: {preview.colors.primary};"
        >
          <div class="preview-title">
            <span class="preview-theme-name">{preview.themeName}</span>
            <span class="preview-theme-phrase">{preview.phrase}</span>
          </div>
        </div>

        <div class="preview-content">
          {#if preview.themeId === "shopping"}
            <ShoppingPreview {preview} />
          {:else if preview.themeId === "pixel-quest"}
            <PixelQuestPreview {preview} />
          {:else if preview.themeId === "map-only"}
            <MapOnlyPreview {preview} />
          {:else if preview.themeId === "mapbox-journey"}
            <MapboxJourneyPreview {preview} />
          {:else if preview.themeId === "coming-soon"}
            <ComingSoonPreview {preview} />
          {:else if preview.layout === "list"}
            <ListPreview {preview} />
          {:else if preview.themeId === "ai-generated"}
            <AiGeneratedPreview {preview} />
          {:else if preview.layout === "timeline"}
            <TimelinePreview {preview} />
          {:else if preview.layout === "week"}
            <WeekPreview {preview} />
          {:else if preview.layout === "month"}
            <MonthPreview {preview} />
          {:else}
            <CardPreview {preview} dateDisplay={getDateDisplay()} />
          {/if}
        </div>

        <div class="preview-features">
          {#each preview.features.slice(0, 3) as feature}
            <span class="feature-tag">{feature}</span>
          {/each}
          {#if preview.features.length > 3}
            <span class="feature-more">+{preview.features.length - 3}</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <div class="preview-dots">
    {#each previews as _, i}
      <button
        class="dot {i === currentIndex ? 'active' : ''}"
        onclick={() => onSelect(i)}
        aria-label="プレビュー {i + 1}"
      ></button>
    {/each}
  </div>

  {#if onTryDemo}
    <button onclick={onTryDemo} class="try-demo-link">
      <span class="try-demo-icon">▶</span>
      <span class="try-demo-label">テーマを試す</span>
    </button>
  {/if}
</div>
