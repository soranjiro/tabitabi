<script lang="ts">
  import { onMount } from "svelte";
  import { IconAirplane } from "./icons";

  interface Props {
    startX: number;
    startY: number;
    onComplete: () => void;
  }

  let { startX, startY, onComplete }: Props = $props();

  let x = $state(startX);
  let y = $state(startY);
  let rotation = $state(-45);
  let trail = $state<
    Array<{ x: number; y: number; opacity: number; id: number }>
  >([]);
  let trailId = 0;

  onMount(() => {
    let currentX = startX;
    let currentY = startY;
    let currentAngle = Math.random() * Math.PI * 2;
    let totalArcs = 0;
    const maxArcs = 5 + Math.floor(Math.random() * 3);
    let returning = false;

    let centerX = 0;
    let centerY = 0;
    let radius = 0;
    let arcStartAngle = 0;
    let arcLength = 0;
    let clockwise = true;
    let arcProgress = 0;
    let stepsInArc = 0;

    function setupNextArc() {
      if (returning) {
        return false;
      }

      if (totalArcs >= maxArcs) {
        returning = true;
        const dx = startX - currentX;
        const dy = startY - currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 5) {
          return false;
        }

        const midX = (currentX + startX) / 2;
        const midY = (currentY + startY) / 2;
        const directAngle = Math.atan2(dy, dx);
        const curveOffset = 8 + Math.random() * 12;
        clockwise = Math.random() > 0.5;
        const sign = clockwise ? 1 : -1;

        centerX =
          midX + Math.cos(directAngle + Math.PI / 2) * curveOffset * sign;
        centerY =
          midY + Math.sin(directAngle + Math.PI / 2) * curveOffset * sign;
        radius = Math.sqrt(
          Math.pow(currentX - centerX, 2) + Math.pow(currentY - centerY, 2),
        );
        arcStartAngle = Math.atan2(currentY - centerY, currentX - centerX);
        arcLength = Math.PI;
        stepsInArc = Math.ceil(arcLength / 0.025);
        arcProgress = 0;
        return true;
      }

      radius = 12 + Math.random() * 28;
      clockwise = Math.random() > 0.5;
      arcLength = Math.PI / 3 + Math.random() * (Math.PI * 0.8);

      const perpAngle = currentAngle + (clockwise ? -Math.PI / 2 : Math.PI / 2);
      centerX = currentX + Math.cos(perpAngle) * radius;
      centerY = currentY + Math.sin(perpAngle) * radius;
      arcStartAngle = perpAngle + Math.PI;

      stepsInArc = Math.ceil(arcLength / 0.025);
      arcProgress = 0;
      totalArcs++;

      return true;
    }

    setupNextArc();

    const animate = () => {
      if (arcProgress >= stepsInArc) {
        const endAngle = clockwise
          ? arcStartAngle - arcLength
          : arcStartAngle + arcLength;
        currentX = centerX + Math.cos(endAngle) * radius;
        currentY = centerY + Math.sin(endAngle) * radius;
        currentAngle = clockwise
          ? endAngle - Math.PI / 2
          : endAngle + Math.PI / 2;

        if (!setupNextArc()) {
          x = startX;
          y = startY;
          rotation = -45;
          trail = [];
          setTimeout(() => {
            onComplete();
          }, 100);
          return;
        }
      }

      const t = arcProgress / stepsInArc;
      const currentArcAngle = clockwise
        ? arcStartAngle - arcLength * t
        : arcStartAngle + arcLength * t;

      let newX = centerX + Math.cos(currentArcAngle) * radius;
      let newY = centerY + Math.sin(currentArcAngle) * radius;

      if (!returning) {
        let didWrap = false;
        if (newX < -5) {
          newX += 110;
          didWrap = true;
        } else if (newX > 105) {
          newX -= 110;
          didWrap = true;
        }
        if (newY < -5) {
          newY += 110;
          didWrap = true;
        } else if (newY > 105) {
          newY -= 110;
          didWrap = true;
        }

        if (didWrap) {
          centerX += newX - (centerX + Math.cos(currentArcAngle) * radius);
          centerY += newY - (centerY + Math.sin(currentArcAngle) * radius);
          currentX = newX;
          currentY = newY;
          trail = [];
        }
      }

      const tangentAngle = clockwise
        ? currentArcAngle - Math.PI / 2
        : currentArcAngle + Math.PI / 2;

      const tailOffsetX = Math.cos(tangentAngle) * 1.5;
      const tailOffsetY = Math.sin(tangentAngle) * 1.5;

      trail = [
        {
          x: newX + tailOffsetX,
          y: newY + tailOffsetY,
          opacity: 0.7,
          id: trailId++,
        },
        ...trail.slice(0, 15).map((t) => ({ ...t, opacity: t.opacity * 0.88 })),
      ].filter((t) => t.opacity > 0.05);

      x = newX;
      y = newY;
      rotation = (tangentAngle * 180) / Math.PI + 90;

      arcProgress++;

      const speed = 28 + Math.random() * 12;
      setTimeout(animate, speed);
    };

    setTimeout(animate, 50);
  });
</script>

<div class="flying-airplane-container">
  {#each trail as point (point.id)}
    <div
      class="trail-dot"
      style="left: {point.x}%; top: {point.y}%; opacity: {point.opacity};"
    ></div>
  {/each}

  <div
    class="flying-airplane"
    style="left: {x}%; top: {y}%; transform: translate(-50%, -50%) rotate({rotation}deg);"
  >
    <IconAirplane size={44} />
  </div>
</div>

<style>
  .flying-airplane-container {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 100;
  }

  .flying-airplane {
    position: absolute;
    color: white;
    filter: drop-shadow(2px 2px 6px rgba(0, 0, 0, 0.3));
    transition:
      left 0.03s linear,
      top 0.03s linear,
      transform 0.05s linear;
  }

  .trail-dot {
    position: absolute;
    width: 6px;
    height: 6px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    filter: blur(2px);
    transition:
      left 0.03s linear,
      top 0.03s linear,
      opacity 0.08s linear;
  }
</style>
