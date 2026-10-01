<script lang="ts">
  import { onMount, tick, untrack } from "svelte";
  import { previews } from "./landing-previews";

  const {
    initialIndex = 0,
    onselect,
  }: {
    initialIndex?: number;
    onselect: (index: number) => void;
  } = $props();

  let index = $state(untrack(() => initialIndex));
  let ready = $state(false);
  let track = $state<HTMLDivElement | null>(null);
  let frame = 0;
  let pendingIndex: number | null = null;

  function centerCard(next: number, behavior: ScrollBehavior = "smooth") {
    const card = track?.children[next] as HTMLElement | undefined;
    if (!track || !card) return;
    track.scrollTo({
      left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : behavior,
    });
  }

  function select(next: number) {
    cancelAnimationFrame(frame);
    index = Math.max(0, Math.min(previews.length - 1, next));
    pendingIndex = index;
    onselect(index);
    centerCard(index);
  }

  function updateSelection() {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!track) return;
      const center = track.scrollLeft + track.clientWidth / 2;
      // Scroll events can still refer to the old position just after a button
      // click. Keep the requested sample selected until its snap point arrives.
      if (pendingIndex !== null) {
        const target = track.children[pendingIndex] as HTMLElement;
        if (Math.abs(target.offsetLeft + target.offsetWidth / 2 - center) > 2)
          return;
        pendingIndex = null;
      }
      let closest = index;
      let distance = Infinity;
      Array.from(track.children).forEach((node, candidate) => {
        const card = node as HTMLElement;
        const delta = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
        if (delta < distance) {
          closest = candidate;
          distance = delta;
        }
      });
      if (closest !== index) {
        index = closest;
        onselect(index);
      }
    });
  }

  onMount(() => {
    let mounted = true;
    ready = true;
    void tick().then(() => {
      if (mounted) centerCard(index, "auto");
    });
    // Preserve the centered card when rotating a phone or resizing the window.
    const observer = new ResizeObserver(() => centerCard(index, "auto"));
    if (track) observer.observe(track);
    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  });
</script>

<section
  class="preview-area"
  data-ready={ready}
  aria-label="しおりのサンプル"
  aria-roledescription="カルーセル"
>
  <div
    class="preview-track"
    role="group"
    aria-label="しおりの一覧"
    bind:this={track}
    onscroll={updateSelection}
    onpointerdown={() => (pendingIndex = null)}
    onwheel={() => (pendingIndex = null)}
  >
    {#each previews as preview, candidate}
      <a
        class="shiori-preview"
        class:active={candidate === index}
        href="/s/{preview.itineraryId}"
        aria-label="{preview.title}のしおりを開く"
        aria-hidden={candidate !== index}
        tabindex={candidate === index ? 0 : -1}
        style={`--accent:${preview.accent}`}
        onclick={(event) => {
          if (candidate !== index) {
            event.preventDefault();
            select(candidate);
          }
        }}
      >
        <div class="preview-body">
          <span class="preview-destination"
            >{preview.destination} / {preview.duration}</span
          >
          <h2>{preview.title}</h2>
          <div class="day-row"><strong>Day 1</strong><span>旅の予定</span></div>
          <ol class="preview-timeline">
            {#each preview.steps as step}
              <li><time>{step.time}</time><span>{step.title}</span></li>
            {/each}
          </ol>
          <div class="preview-more">
            <span>しおりを見る</span><span aria-hidden="true">→</span>
          </div>
        </div>
      </a>
    {/each}
  </div>
  <button
    class="preview-arrow previous"
    type="button"
    aria-label="前のしおり"
    disabled={!ready || index === 0}
    onclick={() => select(index - 1)}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
  </button>
  <button
    class="preview-arrow next"
    type="button"
    aria-label="次のしおり"
    disabled={!ready || index === previews.length - 1}
    onclick={() => select(index + 1)}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
  </button>
  <div class="preview-dots" aria-label="しおりを選ぶ">
    {#each previews as preview, candidate}
      <button
        type="button"
        disabled={!ready}
        class:active={candidate === index}
        aria-label={`${candidate + 1}枚目：${preview.title}`}
        aria-pressed={candidate === index}
        onclick={() => select(candidate)}><span></span></button
      >
    {/each}
  </div>
  <span class="sr-only" aria-live="polite" aria-atomic="true"
    >{index + 1} / {previews.length}：{previews[index]?.title}</span
  >
</section>

<style>
  .preview-area {
    --card-width: 300px;
    position: relative;
    min-width: 0;
    width: 100%;
  }
  .preview-track {
    position: relative;
    display: flex;
    gap: 20px;
    overflow-x: auto;
    padding: 20px calc((100% - var(--card-width)) / 2) 24px;
    scroll-snap-type: x mandatory;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
    -webkit-overflow-scrolling: touch;
  }
  .preview-track::-webkit-scrollbar {
    display: none;
  }
  /* Center the server-selected sample before hydration, too. */
  .preview-area[data-ready="false"] .shiori-preview:not(.active) {
    display: none;
  }
  .shiori-preview {
    flex: 0 0 var(--card-width);
    min-width: 0;
    min-height: 380px;
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 20px;
    color: var(--home-ink-strong);
    background: #fff;
    text-decoration: none;
    scroll-snap-align: center;
    box-shadow: 0 12px 28px rgba(25, 52, 73, 0.13);
    opacity: 0.44;
    transform: scale(0.92);
    transition:
      opacity 180ms ease,
      transform 180ms ease;
  }
  .shiori-preview.active {
    opacity: 1;
    transform: none;
  }
  .preview-body {
    padding: 26px 22px 16px;
  }
  .preview-destination {
    color: var(--home-muted);
    font-size: 11px;
    letter-spacing: 0.04em;
  }
  h2 {
    min-height: 56px;
    margin: 10px 0 18px;
    font-family: var(--home-font-serif);
    font-size: 21px;
    line-height: 1.45;
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .day-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    font-size: 11px;
  }
  .day-row span {
    color: var(--home-muted);
  }
  .preview-timeline {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .preview-timeline li {
    position: relative;
    display: grid;
    grid-template-columns: 43px minmax(0, 1fr);
    gap: 8px;
    min-height: 43px;
    padding: 0 0 12px 20px;
    font-size: 11px;
    line-height: 1.6;
    font-weight: 600;
  }
  .preview-timeline li::before {
    position: absolute;
    left: 3px;
    top: 5px;
    width: 7px;
    height: 7px;
    border: 1.5px solid var(--home-action);
    border-radius: 50%;
    background: white;
    content: "";
  }
  .preview-timeline li:not(:last-child)::after {
    position: absolute;
    left: 6px;
    top: 12px;
    bottom: -5px;
    width: 1px;
    background: var(--accent);
    content: "";
  }
  time {
    color: var(--home-action);
    font-variant-numeric: tabular-nums;
  }
  .preview-timeline li span {
    overflow-wrap: anywhere;
  }
  .preview-more {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 44px;
    border-top: 1px solid var(--home-border);
    color: var(--home-action);
    font-size: 11px;
    font-weight: 700;
  }
  .preview-arrow {
    position: absolute;
    top: calc(50% - 28px);
    display: grid;
    width: 44px;
    height: 44px;
    padding: 0;
    place-items: center;
    border: 1px solid #e3e9ed;
    border-radius: 50%;
    color: var(--home-action);
    background: #fff;
    box-shadow: var(--home-shadow-sm);
    cursor: pointer;
  }
  .previous {
    left: 8px;
  }
  .next {
    right: 8px;
  }
  .preview-arrow svg {
    width: 20px;
    height: 20px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .preview-arrow:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .preview-dots {
    display: flex;
    justify-content: center;
  }
  .preview-dots button {
    display: grid;
    width: 28px;
    height: 32px;
    padding: 0;
    place-items: center;
    border: 0;
    background: transparent;
    cursor: pointer;
  }
  .preview-dots span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #bdcbd5;
  }
  .preview-dots .active span {
    background: var(--home-action);
    transform: scale(1.3);
  }
  button:focus-visible,
  a:focus-visible {
    outline: 3px solid var(--home-focus);
    outline-offset: 3px;
  }
  @media (max-width: 767px) {
    .preview-area {
      --card-width: clamp(218px, 62vw, 270px);
    }
    .preview-track {
      gap: 14px;
      padding-block: 10px 16px;
    }
    .shiori-preview {
      min-height: 0;
      border-radius: 17px;
    }
    .preview-body {
      padding: 18px 18px 8px;
    }
    h2 {
      min-height: 44px;
      margin: 7px 0 12px;
      font-size: 17px;
      line-height: 1.35;
    }
    .day-row {
      margin-bottom: 12px;
    }
    .preview-timeline li {
      min-height: 36px;
      padding-bottom: 9px;
      grid-template-columns: 37px minmax(0, 1fr);
      gap: 4px;
      font-size: 10px;
    }
    .preview-more {
      min-height: 36px;
    }
    .preview-arrow {
      width: 40px;
      height: 40px;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .shiori-preview {
      transition: none;
    }
  }
  @media (max-height: 700px) and (max-width: 767px) {
    .preview-body {
      padding: 10px 14px 6px;
    }
    h2 {
      min-height: 40px;
      margin: 6px 0 8px;
      font-size: 16px;
    }
    .day-row {
      margin-bottom: 6px;
    }
    .preview-timeline li {
      min-height: 32px;
      padding-bottom: 7px;
    }
    .preview-more {
      min-height: 30px;
    }
    .preview-track {
      padding-block: 6px 10px;
    }
    .preview-dots button {
      height: 28px;
    }
  }
</style>
