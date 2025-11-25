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
        class="preview-card {preview.layout} {i === currentIndex
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
          {#if preview.layout === "list"}
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
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
  }

  .dot.active {
    background: white;
    transform: scale(1.2);
  }
</style>
