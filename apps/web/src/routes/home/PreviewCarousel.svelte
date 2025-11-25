<script lang="ts">
  interface Step {
    time: string;
    label: string;
    icon: string;
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
              <div class="timeline-header">{preview.title}</div>
              <div class="timeline-steps">
                {#each preview.steps as step, j}
                  <div class="timeline-step {j === 1 ? 'active' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-line"></div>
                    <div class="timeline-time">{step.time}</div>
                    <div class="timeline-content">
                      <span class="timeline-icon">{step.icon}</span>
                      <span class="timeline-label">{step.label}</span>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {:else}
            <div class="card-preview">
              <div class="card-title">{preview.title}</div>
              <div class="card-steps">
                {#each preview.steps as step, j}
                  <div class="card-step">
                    <div class="card-time-badge">{step.time}</div>
                    <div class="card-content">
                      <span class="card-icon">{step.icon}</span>
                      <span class="card-label">{step.label}</span>
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
  }

  .timeline-header {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 0.6rem;
    padding-bottom: 0.4rem;
    border-bottom: 2px solid var(--primary);
  }

  .timeline-steps {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    position: relative;
    padding-left: 1rem;
  }

  .timeline-step {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    position: relative;
    padding: 0.3rem 0;
  }

  .timeline-dot {
    position: absolute;
    left: -1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 8px;
    height: 8px;
    background: var(--secondary);
    border-radius: 50%;
    border: 2px solid var(--bg);
    z-index: 2;
  }

  .timeline-step.active .timeline-dot {
    background: var(--primary);
    width: 10px;
    height: 10px;
  }

  .timeline-line {
    position: absolute;
    left: calc(-1rem + 3px);
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--border);
  }

  .timeline-step:first-child .timeline-line {
    top: 50%;
  }

  .timeline-step:last-child .timeline-line {
    bottom: 50%;
  }

  .timeline-time {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--primary);
    min-width: 32px;
  }

  .timeline-content {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex: 1;
  }

  .timeline-icon {
    font-size: 0.75rem;
  }

  .timeline-label {
    font-size: 0.7rem;
    color: var(--text);
    font-weight: 500;
  }

  .timeline-step.active {
    background: color-mix(in srgb, var(--primary) 10%, transparent);
    border-radius: 6px;
    margin: 0 -0.25rem;
    padding: 0.3rem 0.25rem;
  }

  /* AI Generated - Card Style */
  .card-preview {
    height: 100%;
  }

  .card-title {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }

  .card-steps {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .card-step {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem;
    background: white;
    border-radius: 8px;
    border: 1px solid var(--border);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }

  .card-time-badge {
    font-size: 0.55rem;
    font-weight: 700;
    color: white;
    background: var(--primary);
    padding: 0.2rem 0.4rem;
    border-radius: 4px;
    min-width: 36px;
    text-align: center;
  }

  .card-content {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    flex: 1;
  }

  .card-icon {
    font-size: 0.8rem;
  }

  .card-label {
    font-size: 0.7rem;
    color: var(--text);
    font-weight: 500;
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
