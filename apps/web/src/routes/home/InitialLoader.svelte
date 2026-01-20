<script lang="ts">
  import { onMount } from "svelte";

  interface Props {
    onComplete: () => void;
    minDuration?: number;
  }

  let { onComplete, minDuration = 600 }: Props = $props();
  let fading = $state(false);

  onMount(() => {
    const timer = setTimeout(() => {
      fading = true;
      setTimeout(onComplete, 350);
    }, minDuration);

    return () => clearTimeout(timer);
  });
</script>

<div class="loader-overlay" class:fading>
  <div class="loader-content">
    <div class="flight-path">
      <svg class="airplane" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
        />
      </svg>
      <div class="cloud cloud-1"></div>
      <div class="cloud cloud-2"></div>
      <div class="cloud cloud-3"></div>
    </div>
    <p class="loader-text">旅の準備中...</p>
  </div>
</div>

<style>
  .loader-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: linear-gradient(145deg, #84c6ff 0%, #a6b3ff 50%, #b5daf8 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.6s ease-out;
  }

  .loader-overlay.fading {
    opacity: 0;
    pointer-events: none;
  }

  .loader-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
  }

  .flight-path {
    position: relative;
    width: 200px;
    height: 120px;
  }

  .airplane {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 48px;
    height: 48px;
    color: white;
    filter: drop-shadow(2px 4px 6px rgba(0, 0, 0, 0.2));
    animation: fly 2s ease-in-out infinite;
    transform-origin: center;
    will-change: transform;
  }

  @keyframes fly {
    0% {
      transform: translate(-150%, -50%) rotate(-90deg);
    }
    25% {
      transform: translate(-20%, -70%) rotate(-60deg);
    }
    50% {
      transform: translate(60%, -45%) rotate(-110deg);
    }
    75% {
      transform: translate(135%, -65%) rotate(-70deg);
    }
    100% {
      transform: translate(210%, -50%) rotate(-90deg);
    }
  }

  .cloud {
    position: absolute;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 50px;
    animation: drift linear infinite;
    will-change: transform;
  }

  .cloud::before,
  .cloud::after {
    content: "";
    position: absolute;
    background: inherit;
    border-radius: 50%;
  }

  .cloud-1 {
    width: 50px;
    height: 20px;
    top: 20%;
    left: 70%;
    animation-duration: 8s;
  }

  .cloud-1::before {
    width: 25px;
    height: 25px;
    top: -12px;
    left: 8px;
  }

  .cloud-1::after {
    width: 18px;
    height: 18px;
    top: -8px;
    right: 8px;
  }

  .cloud-2 {
    width: 40px;
    height: 16px;
    top: 60%;
    left: 20%;
    animation-duration: 10s;
    animation-delay: -3s;
  }

  .cloud-2::before {
    width: 20px;
    height: 20px;
    top: -10px;
    left: 6px;
  }

  .cloud-2::after {
    width: 14px;
    height: 14px;
    top: -6px;
    right: 6px;
  }

  .cloud-3 {
    width: 35px;
    height: 14px;
    top: 75%;
    left: 60%;
    animation-duration: 12s;
    animation-delay: -6s;
  }

  .cloud-3::before {
    width: 16px;
    height: 16px;
    top: -8px;
    left: 5px;
  }

  @keyframes drift {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-120px);
    }
  }

  .loader-text {
    color: white;
    font-size: 1.1rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    animation: pulse-text 1.5s ease-in-out infinite;
  }

  @keyframes pulse-text {
    0%,
    100% {
      opacity: 0.7;
    }
    50% {
      opacity: 1;
    }
  }
</style>
