<script lang="ts">
  interface Step {
    time: string;
    label: string;
    icon: string;
  }

  interface PreviewItinerary {
    title: string;
    theme: string;
    steps: Step[];
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
        class="preview-card {i === currentIndex
          ? 'active'
          : i === (currentIndex + 1) % previews.length
            ? 'next'
            : 'prev'}"
      >
        <div class="preview-header">
          <span class="preview-dot red"></span>
          <span class="preview-dot yellow"></span>
          <span class="preview-dot green"></span>
        </div>
        <div class="preview-content">
          <div class="preview-title">{preview.title}</div>
          <div class="preview-timeline">
            {#each preview.steps as step, j}
              <div class="preview-step {j === 2 ? 'active' : ''}">
                <span class="preview-time">{step.time}</span>
                <span class="preview-icon">{step.icon}</span>
                <span class="preview-label">{step.label}</span>
              </div>
            {/each}
          </div>
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
    height: 320px;
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
    background: white;
    border-radius: 16px;
    box-shadow: 0 15px 40px rgba(0, 0, 0, 0.2);
    width: 260px;
    opacity: 0;
    transform: translateX(40px) scale(0.9);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
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
    background: #f3f4f6;
    padding: 0.6rem 0.75rem;
    border-radius: 16px 16px 0 0;
    display: flex;
    gap: 0.4rem;
  }

  .preview-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .preview-dot.red {
    background: #ef4444;
  }
  .preview-dot.yellow {
    background: #eab308;
  }
  .preview-dot.green {
    background: #22c55e;
  }

  .preview-content {
    padding: 1rem;
  }

  .preview-title {
    font-size: 1rem;
    font-weight: 700;
    color: #374151;
    margin-bottom: 0.75rem;
  }

  .preview-timeline {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .preview-step {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border-radius: 8px;
    background: #f9fafb;
    font-size: 0.85rem;
  }

  .preview-step.active {
    background: linear-gradient(135deg, #6b8cce20, #8b7dc920);
    border-left: 3px solid #6b8cce;
  }

  .preview-time {
    font-size: 0.7rem;
    font-weight: 600;
    color: #9ca3af;
    min-width: 36px;
  }

  .preview-icon {
    font-size: 0.9rem;
  }

  .preview-label {
    color: #374151;
    font-size: 0.8rem;
  }

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
