<script lang="ts">
  interface Props {
    enabled?: boolean;
  }

  let { enabled = true }: Props = $props();

  let particles = $state<
    Array<{
      id: number;
      x: number;
      y: number;
      size: number;
      duration: number;
      delay: number;
    }>
  >([]);

  $effect(() => {
    if (!enabled) return;

    const count = 10;
    const newParticles = [];

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * 8,
      });
    }

    particles = newParticles;
  });
</script>

{#if enabled}
  <div class="particle-container" aria-hidden="true">
    {#each particles as particle (particle.id)}
      <div
        class="particle"
        style="
          left: {particle.x}%;
          top: {particle.y}%;
          width: {particle.size}px;
          height: {particle.size}px;
          animation-duration: {particle.duration}s;
          animation-delay: {particle.delay}s;
        "
      ></div>
    {/each}
  </div>
{/if}
