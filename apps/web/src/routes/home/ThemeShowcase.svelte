<script lang="ts">
  import { onMount } from "svelte";

  interface Step {
    time: string;
    label: string;
    icon: string;
    location?: string;
  }

  interface ThemeColors {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
    border?: string;
  }

  interface PreviewItinerary {
    title: string;
    themeId: string;
    themeName: string;
    description: string;
    layout: "list" | "timeline" | "card";
    colors: ThemeColors;
    steps: Step[];
    features: string[];
  }

  interface Props {
    previews: PreviewItinerary[];
  }

  let { previews }: Props = $props();
  let currentIndex = $state(0);
  let touchStartX = $state(0);

  function next() {
    currentIndex = (currentIndex + 1) % previews.length;
  }

  function prev() {
    currentIndex = (currentIndex - 1 + previews.length) % previews.length;
  }

  function handleTouchStart(e: TouchEvent) {
    touchStartX = e.touches[0].clientX;
  }

  function handleTouchEnd(e: TouchEvent) {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
  }

  onMount(() => {
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  });

  const current = $derived(previews[currentIndex]);
</script>

<div
  class="carousel"
  ontouchstart={handleTouchStart}
  ontouchend={handleTouchEnd}
>
  <div
    class="preview-card theme-{current.themeId}"
    style="--bg: {current.colors.background}; --text: {current.colors
      .text}; --primary: {current.colors.primary};"
  >
    {#if current.themeId === "pixel-quest"}
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
          <span class="pq-quest-text">{current.steps[0]?.label}</span>
          <span class="pq-exp">+25 EXP</span>
        </div>
      </div>
    {:else if current.themeId === "ai-generated"}
      <div class="ai-preview">
        <div class="ai-header">
          <span class="ai-emoji">🏝️</span>
          <span class="ai-title">{current.title}</span>
        </div>
        <div class="ai-timeline">
          {#each current.steps.slice(0, 3) as step}
            <div class="ai-step">
              <span class="ai-time">{step.time}</span>
              <span class="ai-label">{step.label}</span>
            </div>
          {/each}
        </div>
      </div>
    {:else if current.themeId === "shopping"}
      <div class="shopping-preview">
        <div class="shopping-header">{current.title}</div>
        <div class="shopping-list">
          {#each current.steps.slice(0, 3) as step, j}
            <div class="shopping-item" class:done={j === 0}>
              <span class="shopping-check">{j === 0 ? "✓" : ""}</span>
              <span>{step.label}</span>
            </div>
          {/each}
        </div>
      </div>
    {:else if current.themeId === "coming-soon"}
      <div class="coming-preview">
        <span class="coming-q">？</span>
        <span class="coming-text">Coming Soon</span>
      </div>
    {:else if current.layout === "list"}
      <div class="list-preview">
        <div class="list-header">{current.title}</div>
        <div class="list-steps">
          {#each current.steps.slice(0, 3) as step}
            <div class="list-step">
              <span class="list-time">{step.time}</span>
              <span class="list-label">{step.label}</span>
            </div>
          {/each}
        </div>
      </div>
    {:else}
      <div class="timeline-preview">
        <div class="timeline-header">{current.title}</div>
        <div class="timeline-steps">
          {#each current.steps.slice(0, 3) as step}
            <div class="timeline-step">
              <div class="timeline-dot"></div>
              <span class="timeline-label">{step.label}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <div class="carousel-info">
    <span class="theme-badge" style="background: {current.colors.primary};"
      >{current.themeName}</span
    >
    <span class="theme-desc">{current.description}</span>
  </div>

  <div class="carousel-dots">
    {#each previews as _, i}
      <button
        class="dot"
        class:active={i === currentIndex}
        onclick={() => (currentIndex = i)}
        aria-label="テーマ {i + 1}"
      ></button>
    {/each}
  </div>
</div>

<style>
  .carousel {
    width: 220px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  @media (min-width: 900px) {
    .carousel {
      width: 260px;
    }
  }

  .preview-card {
    width: 100%;
    height: 160px;
    background: var(--bg, white);
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  @media (min-width: 900px) {
    .preview-card {
      height: 180px;
    }
  }

  .carousel-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .theme-badge {
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
  }

  .theme-desc {
    color: rgba(255, 255, 255, 0.9);
    font-size: 0.7rem;
  }

  .carousel-dots {
    display: flex;
    gap: 0.4rem;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    border: none;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s;
  }

  .dot.active {
    background: white;
    transform: scale(1.3);
  }

  .list-preview,
  .timeline-preview,
  .shopping-preview {
    height: 100%;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
  }

  .list-header,
  .timeline-header,
  .shopping-header {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 0.5rem;
    text-align: center;
  }

  .list-steps,
  .shopping-list {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  .list-step {
    display: flex;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: var(--text);
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--border, #eee);
  }

  .list-time {
    color: var(--primary);
    font-weight: 600;
    min-width: 40px;
  }

  .timeline-steps {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-left: 0.5rem;
  }

  .timeline-step {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    position: relative;
  }

  .timeline-dot {
    width: 8px;
    height: 8px;
    background: var(--primary);
    border-radius: 50%;
    flex-shrink: 0;
  }

  .timeline-step:not(:last-child)::before {
    content: "";
    position: absolute;
    left: 3.5px;
    top: 12px;
    width: 1px;
    height: 16px;
    background: var(--primary);
  }

  .timeline-label {
    font-size: 0.7rem;
    color: var(--text);
  }

  .shopping-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.7rem;
    color: var(--text);
    padding: 0.25rem 0;
  }

  .shopping-item.done {
    opacity: 0.5;
    text-decoration: line-through;
  }

  .shopping-check {
    width: 14px;
    height: 14px;
    border: 2px solid var(--primary);
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    color: var(--primary);
  }

  .shopping-item.done .shopping-check {
    background: var(--primary);
    color: white;
  }

  .theme-pixel-quest {
    background: #2d1b0e !important;
  }

  .pq-preview {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .pq-map {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .pq-svg {
    width: 100%;
    height: 100%;
  }

  .pq-player {
    position: absolute;
    left: 12%;
    top: 42%;
    transform: translate(-50%, -50%);
    animation: pq-bounce 0.6s ease-in-out infinite;
  }

  @keyframes pq-bounce {
    0%,
    100% {
      transform: translate(-50%, -50%);
    }
    50% {
      transform: translate(-50%, calc(-50% - 3px));
    }
  }

  .pq-player-body {
    width: 12px;
    height: 16px;
    background: linear-gradient(
      180deg,
      #8b4513 0% 20%,
      #f4c898 20% 45%,
      #4a90d9 45% 75%,
      #5b3c11 75% 100%
    );
    border-radius: 2px 2px 0 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .pq-quest-bar {
    background: linear-gradient(180deg, #3d2815 0%, #2d1b0e 100%);
    border-top: 2px solid #d4a853;
    padding: 0.4rem 0.6rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .pq-quest-icon {
    font-size: 0.8rem;
  }

  .pq-quest-text {
    flex: 1;
    font-size: 0.7rem;
    color: #f4e8d3;
    font-weight: 600;
  }

  .pq-exp {
    font-size: 0.6rem;
    color: #ffd700;
    font-weight: 700;
  }

  .theme-ai-generated {
    background: #fafafa !important;
  }

  .ai-preview {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .ai-header {
    background: linear-gradient(135deg, #0284c7, #38bdf8);
    padding: 0.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
  }

  .ai-emoji {
    font-size: 1.2rem;
  }

  .ai-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: white;
  }

  .ai-timeline {
    flex: 1;
    padding: 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .ai-step {
    display: flex;
    gap: 0.5rem;
    font-size: 0.7rem;
    background: white;
    padding: 0.4rem 0.5rem;
    border-radius: 6px;
    border-left: 3px solid #0284c7;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .ai-time {
    color: #0284c7;
    font-weight: 600;
    min-width: 36px;
  }

  .ai-label {
    color: #333;
  }

  .theme-coming-soon {
    background: #333 !important;
  }

  .coming-preview {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .coming-q {
    font-size: 3rem;
    color: #fff;
    font-weight: 700;
  }

  .coming-text {
    font-size: 0.8rem;
    color: #888;
  }

  @media (prefers-color-scheme: dark) {
    .theme-ai-generated {
      background: #18181b !important;
    }

    .ai-timeline {
      background: #18181b;
    }

    .ai-step {
      background: #27272a;
      border-left-color: #38bdf8;
    }

    .ai-time {
      color: #38bdf8;
    }

    .ai-label {
      color: #fafafa;
    }
  }
</style>
