<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    title: string;
    description: string;
    icon: Snippet;
  }

  let { title, description, icon }: Props = $props();

  type AnimationType = "bounce" | "spin" | "shake" | "pulse" | "flip";
  let currentAnimation = $state<AnimationType | null>(null);

  const animations: AnimationType[] = [
    "bounce",
    "spin",
    "shake",
    "pulse",
    "flip",
  ];

  function triggerAnimation() {
    if (currentAnimation) return;
    const randomAnim =
      animations[Math.floor(Math.random() * animations.length)];
    currentAnimation = randomAnim;
    setTimeout(() => {
      currentAnimation = null;
    }, 800);
  }
</script>

<div class="feature-card">
  <button
    class="feature-icon"
    class:anim-bounce={currentAnimation === "bounce"}
    class:anim-spin={currentAnimation === "spin"}
    class:anim-shake={currentAnimation === "shake"}
    class:anim-pulse={currentAnimation === "pulse"}
    class:anim-flip={currentAnimation === "flip"}
    onclick={triggerAnimation}
    aria-label="{title}のアニメーション"
  >
    {@render icon()}
  </button>
  <h3>{title}</h3>
  <p>{description}</p>
</div>

<style>
  .feature-card {
    text-align: center;
    padding: 1.25rem 0.75rem;
    border-radius: 12px;
  }

  .feature-icon {
    margin-bottom: 0.75rem;
    color: #6b8cce;
    transition: transform 0.3s;
    background: none;
    border: none;
    padding: 0.75rem;
    cursor: pointer;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    min-height: 48px;
  }

  .feature-icon:hover {
    background: rgba(107, 140, 206, 0.1);
  }

  .feature-card:hover .feature-icon {
    transform: scale(1.1);
  }

  .feature-icon :global(svg) {
    display: block;
    margin: 0 auto;
  }

  .anim-bounce {
    animation: iconBounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  .anim-spin {
    animation: iconSpin 0.6s ease-in-out;
  }

  .anim-shake {
    animation: iconShake 0.6s ease-in-out;
  }

  .anim-pulse {
    animation: iconPulse 0.8s ease-in-out;
  }

  .anim-flip {
    animation: iconFlip 0.6s ease-in-out;
  }

  @keyframes iconBounce {
    0%,
    100% {
      transform: translateY(0) scale(1);
    }
    25% {
      transform: translateY(-12px) scale(1.1);
    }
    50% {
      transform: translateY(-6px) scale(1);
    }
    75% {
      transform: translateY(-8px) scale(1.05);
    }
  }

  @keyframes iconSpin {
    0% {
      transform: rotate(0deg) scale(1);
    }
    50% {
      transform: rotate(180deg) scale(1.2);
    }
    100% {
      transform: rotate(360deg) scale(1);
    }
  }

  @keyframes iconShake {
    0%,
    100% {
      transform: translateX(0);
    }
    10%,
    30%,
    50%,
    70%,
    90% {
      transform: translateX(-4px);
    }
    20%,
    40%,
    60%,
    80% {
      transform: translateX(4px);
    }
  }

  @keyframes iconPulse {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    25% {
      transform: scale(1.3);
      opacity: 0.6;
    }
    50% {
      transform: scale(0.8);
      opacity: 0.3;
    }
    75% {
      transform: scale(1.1);
      opacity: 0.8;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }

  @keyframes iconFlip {
    0% {
      transform: perspective(400px) rotateY(0);
    }
    50% {
      transform: perspective(400px) rotateY(180deg) scale(1.1);
    }
    100% {
      transform: perspective(400px) rotateY(360deg);
    }
  }

  .feature-card h3 {
    font-size: 0.95rem;
    font-weight: 700;
    color: #374151;
    margin-bottom: 0.4rem;
  }

  .feature-card p {
    font-size: 0.75rem;
    color: #4b5563;
    line-height: 1.4;
    white-space: pre-line;
  }
</style>
