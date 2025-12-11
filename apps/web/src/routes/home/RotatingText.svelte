<script lang="ts">
  import { onMount } from "svelte";
  import { getThemePhrases } from "$lib/themes";

  interface Props {
    currentIndex: number;
  }

  let { currentIndex }: Props = $props();

  const phrases = getThemePhrases();
  let maxWidth = $state<number | null>(null);
  let isAnimating = $state(false);
  let previousIndex = $state(currentIndex);

  function measureMaxWidth() {
    const probe = document.createElement("span");
    probe.className = "rotating-text";
    probe.style.visibility = "hidden";
    probe.style.position = "absolute";
    probe.style.whiteSpace = "nowrap";
    document.body.appendChild(probe);

    let widest = 0;
    for (const phrase of phrases) {
      probe.textContent = phrase;
      const width = probe.getBoundingClientRect().width;
      if (width > widest) widest = width;
    }

    document.body.removeChild(probe);
    return widest;
  }

  $effect(() => {
    if (currentIndex !== previousIndex) {
      isAnimating = true;
      const timeout = setTimeout(() => {
        isAnimating = false;
        previousIndex = currentIndex;
      }, 300);
      return () => clearTimeout(timeout);
    }
  });

  onMount(() => {
    maxWidth = measureMaxWidth();
  });
</script>

<span
  class="rotating-text"
  class:fade-out={isAnimating}
  style:--rotating-text-width={maxWidth
    ? `${Math.ceil(maxWidth)}px`
    : undefined}
>
  {phrases[currentIndex]}
</span>

<style>
  .rotating-text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.1em 0.25em;
    margin-right: 0.75rem;
    width: var(--rotating-text-width, auto);
    min-width: var(--rotating-text-width, auto);
    letter-spacing: 0.01em;
    white-space: nowrap;
    text-align: center;
    transition:
      opacity 0.2s,
      transform 0.3s;
  }

  .fade-out {
    opacity: 0;
    transform: translateY(8px);
  }
</style>
