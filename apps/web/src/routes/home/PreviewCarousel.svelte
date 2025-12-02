<script lang="ts">
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
    currentIndex: number;
    onSelect: (index: number) => void;
  }

  let { previews, currentIndex, onSelect }: Props = $props();

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
          <span class="preview-theme-name">{preview.themeName}</span>
          <span class="preview-theme-desc">{preview.description}</span>
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
          {:else if preview.themeId === "coming-soon"}
            <div class="coming-preview">
              <span class="coming-question">？</span>
            </div>
          {:else if preview.layout === "list"}
            <div class="minimal-preview">
              <div class="minimal-title">{preview.title}</div>
              <div class="minimal-divider"></div>
              <div class="minimal-steps">
                {#each preview.steps as step, j}
                  <div class="minimal-step">
                    <span class="minimal-time">{step.time}</span>
                    <span class="minimal-label">{step.label}</span>
                  </div>
                {/each}
              </div>
            </div>
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
            <div class="timeline-preview">
              <div class="timeline-title">{preview.title}</div>
              <div class="timeline-day-card">
                <div class="timeline-ribbon"></div>
                <div class="timeline-date-header">11月25日</div>
                <div class="timeline-steps">
                  {#each preview.steps as step, j}
                    <div class="timeline-step {j === 0 ? 'active' : ''}">
                      <div class="timeline-time-col">
                        <span class="timeline-time">{step.time}</span>
                        <div class="timeline-dot"></div>
                        {#if j < preview.steps.length - 1}
                          <div class="timeline-line"></div>
                        {/if}
                      </div>
                      <div class="timeline-content-card">
                        <div class="timeline-content-main">
                          <span class="timeline-label">{step.label}</span>
                          {#if step.location}
                            <span class="timeline-location"
                              >📍 {step.location}</span
                            >
                          {/if}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {:else}
            <div class="card-preview">
              <div class="card-title">{preview.title}</div>
              <div class="card-date-header">
                <span class="date-icon">🗓️</span>
                <span class="date-text">{getDateDisplay()}</span>
              </div>
              <div class="card-steps">
                {#each preview.steps as step, j}
                  <div class="card-step">
                    <div class="card-time-badge">{step.time}</div>
                    <div class="card-main-content">
                      <span class="card-label">{step.label}</span>
                      {#if step.location}
                        <span class="card-location">📍 {step.location}</span>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
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
</div>

<style>
  .hero-visual {
    position: relative;
    width: 280px;
    height: 340px;
  }

  .preview-carousel {
    position: relative;
    width: 100%;
    height: 100%;
  }

  @media (min-width: 900px) {
    .hero-visual {
      margin-right: 2rem;
    }
  }

  .preview-card {
    position: absolute;
    top: 0;
    left: 0;
    background: var(--bg, white);
    border-radius: 12px;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
    width: 260px;
    opacity: 0;
    transform: translateX(40px) scale(0.9);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .preview-card.card {
    background: linear-gradient(135deg, #fdf2f8 0%, #faf5ff 50%, #f5f3ff 100%);
  }

  .preview-card.active {
    opacity: 1;
    transform: translateX(0) scale(1);
    pointer-events: auto;
    z-index: 3;
  }

  .preview-card.next {
    opacity: 0.5;
    transform: translateX(30px) translateY(20px) scale(0.92);
    z-index: 2;
  }

  .preview-card.prev {
    opacity: 0;
    transform: translateX(-40px) scale(0.9);
    z-index: 1;
  }

  .preview-header {
    padding: 0.5rem 0.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .preview-theme-name {
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .preview-theme-desc {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.6rem;
  }

  .preview-content {
    flex: 1;
    padding: 0.75rem;
    overflow: hidden;
  }

  .preview-features {
    padding: 0.5rem 0.75rem;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  .feature-tag {
    font-size: 0.55rem;
    padding: 0.15rem 0.4rem;
    background: var(--primary);
    color: white;
    border-radius: 4px;
    opacity: 0.9;
  }

  .feature-more {
    font-size: 0.55rem;
    padding: 0.15rem 0.35rem;
    background: var(--secondary);
    color: white;
    border-radius: 4px;
  }

  /* Minimal - List Style */
  .minimal-preview {
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .minimal-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 0.5rem;
  }

  .minimal-divider {
    height: 1px;
    background: var(--border);
    margin-bottom: 0.6rem;
  }

  .minimal-steps {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .minimal-step {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.35rem 0;
    border-bottom: 1px solid var(--border);
  }

  .minimal-step:last-child {
    border-bottom: none;
  }

  .minimal-time {
    font-size: 0.65rem;
    font-weight: 500;
    color: var(--secondary);
    min-width: 38px;
  }

  .minimal-label {
    font-size: 0.75rem;
    color: var(--text);
    font-weight: 500;
  }

  /* Standard-Autumn - Timeline Style */
  .timeline-preview {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    position: relative;
  }

  .timeline-title {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text);
    text-align: center;
  }

  .timeline-day-card {
    background: linear-gradient(135deg, #fffdf8 0%, #fcf9f2 100%);
    border-radius: 12px;
    padding: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    position: relative;
    overflow: hidden;
    flex: 1;
  }

  .timeline-ribbon {
    position: absolute;
    top: 0;
    left: 0.75rem;
    width: 1.2rem;
    height: 2rem;
    background: linear-gradient(180deg, var(--primary) 0%, var(--accent) 100%);
    clip-path: polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%);
  }

  .timeline-date-header {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text);
    text-align: center;
    padding: 0.25rem 0 0.35rem;
    border-bottom: 1px dashed var(--border);
    margin-bottom: 0.35rem;
  }

  .timeline-steps {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .timeline-step {
    display: flex;
    align-items: stretch;
    gap: 0.35rem;
  }

  .timeline-time-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 2.5rem;
    flex-shrink: 0;
  }

  .timeline-time {
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--primary);
  }

  .timeline-dot {
    width: 8px;
    height: 8px;
    background: var(--primary);
    border-radius: 50%;
    margin: 0.15rem 0;
  }

  .timeline-line {
    flex: 1;
    width: 2px;
    background: var(--primary);
    min-height: 0.5rem;
  }

  .timeline-content-card {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    background: white;
    border-radius: 6px;
    padding: 0.35rem 0.4rem;
    border-left: 3px solid var(--primary);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }

  .timeline-content-main {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .timeline-label {
    font-size: 0.65rem;
    color: var(--text);
    font-weight: 600;
  }

  .timeline-location {
    font-size: 0.5rem;
    color: var(--accent);
    opacity: 0.9;
  }

  .timeline-step.active .timeline-dot {
    background: var(--primary);
    box-shadow: 0 0 0 2px rgba(169, 53, 41, 0.2);
  }

  /* AI Generated - Card Style */
  .card-preview {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .card-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text);
    text-align: center;
  }

  .card-date-header {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.9),
      rgba(255, 255, 255, 0.7)
    );
    border-radius: 8px;
    padding: 0.4rem 0.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .date-icon {
    font-size: 0.7rem;
  }

  .date-text {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--text);
  }

  .card-steps {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .card-step {
    display: flex;
    align-items: flex-start;
    gap: 0.4rem;
    padding: 0.4rem;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.95),
      rgba(255, 255, 255, 0.85)
    );
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    position: relative;
  }

  .card-time-badge {
    font-size: 0.55rem;
    font-weight: 700;
    color: var(--primary);
    background: linear-gradient(
      135deg,
      rgba(232, 121, 169, 0.15),
      rgba(168, 85, 247, 0.1)
    );
    padding: 0.25rem 0.4rem;
    border-radius: 12px;
    min-width: 36px;
    text-align: center;
  }

  .card-main-content {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    flex: 1;
  }

  .card-label {
    font-size: 0.7rem;
    color: var(--text);
    font-weight: 600;
  }

  .card-location {
    font-size: 0.55rem;
    color: var(--primary);
    opacity: 0.8;
  }

  /* AI Generated Theme */
  .preview-card.theme-ai-generated {
    background: #fafafa;
  }

  .preview-card.theme-ai-generated .preview-content {
    padding: 0;
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
    color: #18181b;
  }

  /* Shopping Theme */
  .shopping-preview {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .shopping-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 0.2rem;
  }

  .shopping-store {
    background: white;
    border-radius: 8px;
    border: 1px solid var(--border);
    overflow: hidden;
  }

  .shopping-store-name {
    font-size: 0.6rem;
    font-weight: 700;
    color: var(--primary);
    background: rgba(16, 185, 129, 0.1);
    padding: 0.25rem 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  .shopping-items {
    display: flex;
    flex-direction: column;
  }

  .shopping-item {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  .shopping-item:last-child {
    border-bottom: none;
  }

  .shopping-item.done {
    opacity: 0.5;
  }

  .shopping-item.done .shopping-label {
    text-decoration: line-through;
  }

  .shopping-checkbox {
    width: 14px;
    height: 14px;
    border: 2px solid var(--primary);
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.5rem;
    color: var(--primary);
    flex-shrink: 0;
  }

  .shopping-item.done .shopping-checkbox {
    background: var(--primary);
    color: white;
  }

  .shopping-label {
    font-size: 0.65rem;
    color: var(--text);
  }

  /* Pixel Quest Theme */
  .preview-card.theme-pixel-quest {
    background: #2d1b0e;
  }

  .preview-card.theme-pixel-quest .preview-content {
    padding: 0;
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

  /* Coming Soon Theme */
  .preview-card.theme-coming-soon {
    background: #333333;
  }

  .preview-card.theme-coming-soon .preview-header {
    background: #333333 !important;
    border-bottom: 1px solid #333;
  }

  .preview-card.theme-coming-soon .preview-features {
    border-top: 1px solid #333;
  }

  .coming-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
  }

  .coming-question {
    font-size: 4rem;
    color: #ffffff;
    font-weight: 700;
    padding: 2rem;
  }

  /* Dots */
  .preview-dots {
    position: absolute;
    bottom: -1.5rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 0.5rem;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    padding: 4px;
    box-sizing: content-box;
  }

  .dot.active {
    background: white;
    transform: scale(1.2);
  }
</style>
