<script lang="ts">
  import { onMount } from "svelte";

  const phrases = [
    "　　一日の予定",
    "　旅行のしおり",
    "買い物のプラン",
    "面白いデザイン",
    "ユニークな体験",
    "自分だけの計画",
  ];
  let maxWidth = $state<number | null>(null);

  let currentIndex = $state(0);
  let isAnimating = $state(false);

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

  onMount(() => {
    maxWidth = measureMaxWidth();

    const interval = setInterval(() => {
      isAnimating = true;
      setTimeout(() => {
        currentIndex = (currentIndex + 1) % phrases.length;
        isAnimating = false;
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
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
    width: var(--rotating-text-width, auto);
    min-width: var(--rotating-text-width, auto);
    white-space: nowrap;
    text-align: center;
    transition:
      opacity 0.3s,
      transform 0.3s;
  }

  .fade-out {
    opacity: 0;
    transform: translateY(-8px);
  }
</style>
