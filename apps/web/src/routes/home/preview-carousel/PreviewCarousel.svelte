<script lang="ts">
  import "./styles/index.css";
  import type { PreviewItinerary } from "../previewData/types";
  import CardPreview from "./views/CardPreview.svelte";
  import ListPreview from "./views/ListPreview.svelte";
  import TimelinePreview from "./views/TimelinePreview.svelte";
  import WeekPreview from "./views/WeekPreview.svelte";
  import MonthPreview from "./views/MonthPreview.svelte";

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
            {@const grouped = Object.groupBy(
              preview.steps,
              (s) => s.location || "",
            )}
            <div class="shopping-preview">
              <div class="shopping-title">{preview.title}</div>
              {#each Object.entries(grouped) as [store, items]}
                <div class="shopping-store">
                  <div class="shopping-store-name">{store}</div>
                  <div class="shopping-items">
                    {#each items ?? [] as item, j}
                      <div class="shopping-item" class:done={j === 0}>
                        <span class="shopping-checkbox"
                          >{j === 0 ? "✓" : ""}</span
                        >
                        <span class="shopping-label">{item.label}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/each}
            </div>
          {:else if preview.themeId === "pixel-quest"}
            <div class="pq-preview">
              <div class="pq-map">
                <svg viewBox="0 0 200 100" class="pq-svg">
                  <defs>
                    <pattern
                      id="pq-grass"
                      width="8"
                      height="8"
                      patternUnits="userSpaceOnUse"
                    >
                      <rect width="8" height="8" fill="#7ec850" />
                      <rect x="2" y="5" width="2" height="3" fill="#5b8c3e" />
                      <rect x="6" y="6" width="1" height="2" fill="#5b8c3e" />
                    </pattern>
                  </defs>
                  <rect width="200" height="100" fill="url(#pq-grass)" />
                  <rect
                    x="0"
                    y="0"
                    width="100"
                    height="100"
                    fill="#7ec850"
                    opacity="0.3"
                  />
                  <rect
                    x="100"
                    y="0"
                    width="100"
                    height="100"
                    fill="#d4a853"
                    opacity="0.3"
                  />
                  <text
                    x="50"
                    y="12"
                    text-anchor="middle"
                    fill="#f4e8d3"
                    font-size="8"
                    font-weight="bold">DAY 1</text
                  >
                  <text
                    x="150"
                    y="12"
                    text-anchor="middle"
                    fill="#f4e8d3"
                    font-size="8"
                    font-weight="bold">DAY 2</text
                  >
                  <path
                    d="M30 50 Q65 30 100 50 Q135 70 170 50"
                    stroke="#8b7355"
                    stroke-width="6"
                    fill="none"
                  />
                  <path
                    d="M30 50 Q65 30 100 50 Q135 70 170 50"
                    stroke="#c4a86c"
                    stroke-width="2"
                    stroke-dasharray="4 4"
                    fill="none"
                  />
                  <circle cx="30" cy="50" r="6" fill="#e85d3b" />
                  <circle cx="100" cy="50" r="6" fill="#5d8a4a" />
                  <circle cx="170" cy="50" r="6" fill="#5d8a4a" />
                  <rect x="55" y="25" width="8" height="12" fill="#6b4423" />
                  <rect x="51" y="18" width="16" height="10" fill="#3d8b3d" />
                  <rect x="130" y="60" width="6" height="4" fill="#ffd700" />
                  <rect x="75" y="70" width="10" height="8" fill="#8b7355" />
                </svg>
                <div class="pq-player">
                  <div class="pq-player-body"></div>
                </div>
              </div>
              <div class="pq-quest-bar">
                <span class="pq-quest-icon">⚔️</span>
                <span class="pq-quest-text">{preview.steps[0]?.label}</span>
                <span class="pq-exp">+25 EXP</span>
              </div>
            </div>
          {:else if preview.themeId === "map-only"}
            <div class="map-preview">
              <div class="map-container">
                <svg viewBox="0 0 200 120" class="map-svg">
                  <rect width="200" height="120" fill="#e5e7eb" />
                  <path
                    d="M0 40 Q50 30 80 60 T150 50 T200 80"
                    stroke="white"
                    stroke-width="8"
                    fill="none"
                  />
                  <path
                    d="M40 0 Q50 50 30 120"
                    stroke="white"
                    stroke-width="6"
                    fill="none"
                  />
                  <g transform="translate(60, 40)">
                    <circle cx="0" cy="0" r="4" fill="#ef4444" />
                    <path d="M0 0 L0 -8" stroke="#ef4444" stroke-width="2" />
                    <circle cx="0" cy="-8" r="5" fill="#ef4444" />
                    <circle cx="0" cy="-8" r="2" fill="white" />
                  </g>
                  <g transform="translate(120, 70)">
                    <circle cx="0" cy="0" r="4" fill="#3b82f6" />
                    <path d="M0 0 L0 -8" stroke="#3b82f6" stroke-width="2" />
                    <circle cx="0" cy="-8" r="5" fill="#3b82f6" />
                    <circle cx="0" cy="-8" r="2" fill="white" />
                  </g>
                  <g transform="translate(160, 30)">
                    <circle cx="0" cy="0" r="4" fill="#10b981" />
                    <path d="M0 0 L0 -8" stroke="#10b981" stroke-width="2" />
                    <circle cx="0" cy="-8" r="5" fill="#10b981" />
                    <circle cx="0" cy="-8" r="2" fill="white" />
                  </g>
                </svg>
                <div class="map-card-float top-left">
                  <span class="map-card-icon">📍</span>
                  <span class="map-card-text">浅草寺</span>
                </div>
                <div class="map-card-float bottom-right">
                  <span class="map-card-icon">🗼</span>
                  <span class="map-card-text">スカイツリー</span>
                </div>
              </div>
            </div>
          {:else if preview.themeId === "mapbox-journey"}
            <div class="journey-preview">
              <div class="journey-globe">
                <svg viewBox="0 0 200 100" class="journey-svg">
                  <defs>
                    <radialGradient id="globe-grad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color="#1e293b" />
                      <stop offset="100%" stop-color="#0f172a" />
                    </radialGradient>
                  </defs>
                  <rect width="200" height="120" fill="#020617" />
                  <circle
                    cx="100"
                    cy="160"
                    r="120"
                    fill="url(#globe-grad)"
                    stroke="#334155"
                    stroke-width="1"
                  />
                  <path
                    d="M60 100 Q80 80 100 90 T140 80"
                    stroke="#334155"
                    stroke-width="2"
                    fill="none"
                    opacity="0.5"
                  />
                  <path
                    d="M50 90 Q100 40 150 80"
                    stroke="#38bdf8"
                    stroke-width="2"
                    fill="none"
                    stroke-dasharray="4 4"
                  />
                  <circle cx="50" cy="90" r="4" fill="#f472b6" />
                  <circle cx="150" cy="80" r="4" fill="#f472b6" />
                  <text x="100" y="60" font-size="12" text-anchor="middle"
                    >✈️</text
                  >
                </svg>
              </div>
              <div class="journey-info">
                <div class="journey-route">
                  <span class="journey-city">HND</span>
                  <span class="journey-arrow">✈</span>
                  <span class="journey-city">TPE</span>
                </div>
                <div class="journey-status">In Flight</div>
              </div>
            </div>
          {:else if preview.themeId === "coming-soon"}
            <div class="coming-preview">
              <span class="coming-question">？</span>
            </div>
          {:else if preview.layout === "list"}
            <ListPreview {preview} />
          {:else if preview.themeId === "ai-generated"}
            <div class="ai-preview">
              <div class="ai-header">
                <span class="ai-emoji">🏝️</span>
                <span class="ai-title">{preview.title}</span>
              </div>
              <div class="ai-timeline">
                {#each preview.steps.slice(0, 3) as step}
                  <div class="ai-step">
                    <span class="ai-time">{step.time}</span>
                    <span class="ai-label">{step.label}</span>
                  </div>
                {/each}
              </div>
            </div>
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
