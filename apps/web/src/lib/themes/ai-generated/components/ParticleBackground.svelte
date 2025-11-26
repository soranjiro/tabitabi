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
      type: "circle" | "star" | "dot";
    }>
  >([]);

  $effect(() => {
    if (!enabled) return;

    const count = 15;
    const newParticles = [];

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        duration: Math.random() * 15 + 10,
        delay: Math.random() * 5,
        type: ["circle", "star", "dot"][Math.floor(Math.random() * 3)] as
          | "circle"
          | "star"
          | "dot",
      });
    }

    particles = newParticles;
  });
</script>

{#if enabled}
  <div class="particle-container" aria-hidden="true">
    {#each particles as particle (particle.id)}
      <div
        class="particle particle-{particle.type}"
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

<style>
  .particle-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;
    z-index: -1;
  }

  .particle {
    position: absolute;
    border-radius: 50%;
    opacity: 0.3;
    animation: float linear infinite;
  }

  .particle-circle {
    background: linear-gradient(135deg, var(--ai-primary), var(--ai-secondary));
  }

  .particle-star {
    background: var(--ai-accent);
    clip-path: polygon(
      50% 0%,
      61% 35%,
      98% 35%,
      68% 57%,
      79% 91%,
      50% 70%,
      21% 91%,
      32% 57%,
      2% 35%,
      39% 35%
    );
    border-radius: 0;
  }

  .particle-dot {
    background: var(--ai-secondary);
  }

  @keyframes float {
    0% {
      transform: translateY(100vh) rotate(0deg);
      opacity: 0;
    }
    10% {
      opacity: 0.3;
    }
    90% {
      opacity: 0.3;
    }
    100% {
      transform: translateY(-100px) rotate(720deg);
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .particle {
      animation: none;
      opacity: 0.15;
    }
  }
</style>
