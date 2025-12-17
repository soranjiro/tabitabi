<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { getIconCategory, type IconCategory } from "../utils/layout";

  interface Props {
    step: Step;
    x: number;
    y: number;
    planType?: "A" | "B";
    isSelected?: boolean;
    isCompleted?: boolean;
    onclick?: () => void;
  }

  let {
    step,
    x,
    y,
    planType = "A",
    isSelected = false,
    isCompleted = false,
    onclick,
  }: Props = $props();

  const iconCategory = $derived(getIconCategory(step));

  function getIconClass(category: IconCategory): string {
    return `pq-icon pq-icon-${category}`;
  }
</script>

<button
  class="spot-marker"
  class:selected={isSelected}
  class:completed={isCompleted}
  class:plan-b={planType === "B"}
  style="left: {x}px; top: {y}px;"
  {onclick}
  aria-label={step.title}
>
  <div class="spot-flag">
    <div class="flag-pole"></div>
    <div class="flag-banner"></div>
  </div>
  <div class="spot-icon-wrapper">
    <div class="spot-icon-inner">
      <div class={getIconClass(iconCategory)}></div>
    </div>
    {#if planType === "B"}
      <div class="plan-b-chip">B</div>
    {/if}
    {#if isCompleted}
      <div class="spot-check">
        <div class="check-mark"></div>
      </div>
      <div class="completion-sparkle"></div>
    {/if}
  </div>
  <div class="spot-label-container">
    {#if planType === "B"}
      <div class="plan-b-label">PLAN B</div>
    {/if}
    <div class="spot-label">{step.title}</div>
    <div class="spot-time">{step.time}</div>
  </div>
</button>

<style>
  .spot-marker {
    position: absolute;
    transform: translate(-50%, -50%);
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    transition: transform 0.1s steps(2);
    z-index: 10;
  }

  .spot-marker:hover {
    transform: translate(-50%, -50%) translateY(-6px);
    z-index: 20;
  }

  .spot-marker:hover .spot-icon-wrapper {
    box-shadow:
      4px 4px 0 var(--pq-border-outer),
      0 0 12px rgba(255, 215, 0, 0.4);
  }

  .spot-marker.selected {
    z-index: 30;
  }

  .spot-flag {
    position: relative;
    width: 16px;
    height: 20px;
  }

  .flag-pole {
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 3px;
    height: 20px;
    background: linear-gradient(90deg, #8b5a2b 0%, #a0522d 50%, #6b4423 100%);
    border-radius: 1px;
  }

  .flag-banner {
    position: absolute;
    top: 0;
    left: 8px;
    width: 14px;
    height: 10px;
    background: linear-gradient(180deg, #e85d3b 0%, #c84a2a 100%);
    clip-path: polygon(0 0, 100% 50%, 0 100%);
    animation: flag-flutter 0.8s ease-in-out infinite;
  }

  .spot-marker.selected .flag-banner {
    background: linear-gradient(180deg, #ffd700 0%, #ffb300 100%);
  }

  @keyframes flag-flutter {
    0%,
    100% {
      transform: scaleX(1) skewY(0deg);
    }
    25% {
      transform: scaleX(0.95) skewY(2deg);
    }
    50% {
      transform: scaleX(1) skewY(0deg);
    }
    75% {
      transform: scaleX(0.97) skewY(-1deg);
    }
  }

  .spot-marker.selected .spot-icon-wrapper {
    box-shadow:
      0 0 0 3px var(--pq-ui-gold),
      4px 4px 0 var(--pq-border-outer);
    animation: spot-glow 0.5s steps(2) infinite;
  }

  @keyframes spot-glow {
    0%,
    100% {
      box-shadow:
        0 0 0 3px var(--pq-ui-gold),
        4px 4px 0 var(--pq-border-outer);
    }
    50% {
      box-shadow:
        0 0 0 4px var(--pq-ui-gold),
        0 0 12px rgba(255, 215, 0, 0.6),
        4px 4px 0 var(--pq-border-outer);
    }
  }

  .spot-icon-wrapper {
    width: 40px;
    height: 40px;
    background: linear-gradient(
      135deg,
      var(--pq-bg-light) 0%,
      var(--pq-bg-medium) 50%,
      var(--pq-bg-dark) 100%
    );
    border: 4px solid var(--pq-border-inner);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    box-shadow: 4px 4px 0 var(--pq-border-outer);
    image-rendering: pixelated;
  }

  .spot-icon-wrapper::before {
    content: "";
    position: absolute;
    top: 2px;
    left: 2px;
    right: 2px;
    height: 8px;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.15) 0%,
      transparent 100%
    );
    pointer-events: none;
  }

  .spot-icon-inner {
    transform: scale(1.2);
  }

  .spot-marker.completed .spot-icon-wrapper {
    background: linear-gradient(135deg, #5d8a4a 0%, #4a7a3a 50%, #3d6830 100%);
    border-color: #3d6830;
  }

  .spot-check {
    position: absolute;
    bottom: -8px;
    right: -8px;
    width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #5d8a4a 0%, #4a7a3a 100%);
    border: 2px solid var(--pq-border-outer);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .check-mark {
    width: 6px;
    height: 8px;
    border: solid var(--pq-text-primary);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) translate(-1px, -1px);
  }

  .completion-sparkle {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 8px;
    height: 8px;
    background: #ffd700;
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
    animation: sparkle-rotate 2s linear infinite;
  }

  @keyframes sparkle-rotate {
    0% {
      transform: rotate(0deg) scale(1);
      opacity: 1;
    }
    50% {
      transform: rotate(180deg) scale(1.2);
      opacity: 0.8;
    }
    100% {
      transform: rotate(360deg) scale(1);
      opacity: 1;
    }
  }

  .spot-label-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }

  .spot-label {
    background: var(--pq-bg-dark);
    color: var(--pq-text-primary);
    padding: 3px 8px;
    font-size: 0.5625rem;
    font-family: var(--pq-font-pixel);
    border: 2px solid var(--pq-border-inner);
    box-shadow: 2px 2px 0 var(--pq-border-outer);
    max-width: 80px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    letter-spacing: 0.5px;
  }

  .spot-time {
    background: rgba(45, 27, 14, 0.8);
    color: var(--pq-ui-gold);
    font-size: 0.5rem;
    font-family: var(--pq-font-pixel);
    font-weight: bold;
    padding: 2px 6px;
    text-shadow: 1px 1px 0 var(--pq-border-outer);
    border-radius: 2px;
  }

  .spot-marker.plan-b .spot-icon-wrapper {
    background: linear-gradient(135deg, #1b2f55 0%, #12233f 50%, #0b1a33 100%);
    border-color: #2f4fa3;
    box-shadow:
      4px 4px 0 var(--pq-border-outer),
      0 0 12px rgba(109, 160, 255, 0.35);
  }

  .spot-marker.plan-b .flag-banner {
    background: linear-gradient(180deg, #6da0ff 0%, #3c6ad8 100%);
  }

  .spot-marker.plan-b .spot-label {
    border-color: #2f4fa3;
    color: #d9e6ff;
  }

  .spot-marker.plan-b .spot-time {
    background: rgba(27, 47, 85, 0.9);
    color: #c9dcff;
  }

  .plan-b-chip {
    position: absolute;
    top: -6px;
    left: -6px;
    width: 18px;
    height: 18px;
    background: linear-gradient(180deg, #6da0ff 0%, #3c6ad8 100%);
    border: 2px solid #0f1c36;
    color: #0f1c36;
    font-family: var(--pq-font-pixel);
    font-size: 0.65rem;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 2px 2px 0 var(--pq-border-outer);
  }

  .plan-b-label {
    background: rgba(17, 35, 68, 0.85);
    color: #bcd4ff;
    font-family: var(--pq-font-pixel);
    font-size: 0.45rem;
    letter-spacing: 0.5px;
    padding: 2px 6px;
    border: 2px solid #2f4fa3;
    box-shadow: 2px 2px 0 var(--pq-border-outer);
  }
</style>
