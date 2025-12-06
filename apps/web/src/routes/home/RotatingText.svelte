<script lang="ts">
  import { onMount } from "svelte";

  const phrases = ["旅のしおり", "一日の予定", "買物の予定", "週末プラン"];

  let currentIndex = $state(0);
  let isAnimating = $state(false);

  onMount(() => {
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

<span class="rotating-text" class:fade-out={isAnimating}>
  {phrases[currentIndex]}
</span>

<style>
  .rotating-text {
    display: inline-block;
    transition:
      opacity 0.3s,
      transform 0.3s;
  }

  .fade-out {
    opacity: 0;
    transform: translateY(-8px);
  }
</style>
