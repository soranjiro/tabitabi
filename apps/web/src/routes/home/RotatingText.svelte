<script lang="ts">
  import { onMount } from "svelte";
  import { getThemePhrases } from "$lib/themes";

  interface Props {
    currentIndex: number;
  }

  let { currentIndex }: Props = $props();

  const phrases = getThemePhrases();
  let isAnimating = $state(false);
  let previousIndex = $state(currentIndex);

  $effect(() => {
    if (currentIndex !== previousIndex) {
      isAnimating = true;
      const timeout = setTimeout(() => {
        isAnimating = false;
        previousIndex = currentIndex;
      }, 200);
      return () => clearTimeout(timeout);
    }
  });
</script>

<span class="rotating-text" class:fade-out={isAnimating}>
  {phrases[currentIndex]}
</span>

<style>
  .rotating-text {
    display: inline-block;
    min-width: 7em;
    text-align: center;
    transition:
      opacity 0.15s ease-out,
      transform 0.15s ease-out;
  }

  .fade-out {
    opacity: 0;
    transform: translateY(4px);
  }
</style>
