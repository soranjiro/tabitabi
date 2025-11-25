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
  let visible = $state(true);
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

    let returnProgress = 0;
    let returnSteps = 0;
    let returnStartX = 0;
    let returnStartY = 0;
    let returnAngle = 0;

    function setupNextArc() {
      if (returning) {
        return false;
      }

      if (totalArcs >= maxArcs) {
        returning = true;
        returnStartX = currentX;
        returnStartY = currentY;
        const dx = startX - currentX;
        const dy = startY - currentY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        returnAngle = Math.atan2(dy, dx);
        returnSteps = Math.ceil(distance / 0.8);
        returnProgress = 0;
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
      if (returning) {
        if (returnProgress >= returnSteps) {
          x = startX;
          y = startY;
          rotation = -45;
          trail = [];
          setTimeout(() => {
            onComplete();
          }, 100);
          return;
        }

        const t = returnProgress / returnSteps;
        const newX = returnStartX + (startX - returnStartX) * t;
        const newY = returnStartY + (startY - returnStartY) * t;

        const tailOffsetX = Math.cos(returnAngle) * 1.5;
        const tailOffsetY = Math.sin(returnAngle) * 1.5;

        trail = [
          {
            x: newX - tailOffsetX,
            y: newY - tailOffsetY,
            opacity: 0.7,
            id: trailId++,
          },
          ...trail
            .slice(0, 15)
            .map((t) => ({ ...t, opacity: t.opacity * 0.88 })),
        ].filter((t) => t.opacity > 0.05);

        x = newX;
        y = newY;
        rotation = (returnAngle * 180) / Math.PI + 90;

        returnProgress++;

        const speed = 28 + Math.random() * 12;
        setTimeout(animate, speed);
        return;
      }

      if (arcProgress >= stepsInArc) {
        const endAngle = clockwise
          ? arcStartAngle - arcLength
          : arcStartAngle + arcLength;
        currentX = centerX + Math.cos(endAngle) * radius;
        currentY = centerY + Math.sin(endAngle) * radius;
        currentAngle = clockwise
          ? endAngle - Math.PI / 2
          : endAngle + Math.PI / 2;

        setupNextArc();
        if (returning) {
          const speed = 28 + Math.random() * 12;
          setTimeout(animate, speed);
          return;
        }
      }

      const t = arcProgress / stepsInArc;
      const currentArcAngle = clockwise
        ? arcStartAngle - arcLength * t
        : arcStartAngle + arcLength * t;

      let newX = centerX + Math.cos(currentArcAngle) * radius;
      let newY = centerY + Math.sin(currentArcAngle) * radius;

      let didWrap = false;
      if (newX < -3) {
        newX += 106;
        didWrap = true;
      } else if (newX > 103) {
        newX -= 106;
        didWrap = true;
      }
      if (newY < -3) {
        newY += 106;
        didWrap = true;
      } else if (newY > 103) {
        newY -= 106;
        didWrap = true;
      }

      if (didWrap) {
        visible = false;
        trail = [];

        currentX = newX;
        currentY = newY;

        const towardsCenterAngle = Math.atan2(50 - newY, 50 - newX);
        currentAngle =
          towardsCenterAngle + (Math.random() - 0.5) * (Math.PI / 4);

        radius = 20 + Math.random() * 25;
        clockwise = Math.random() > 0.5;
        arcLength = Math.PI / 3 + Math.random() * (Math.PI / 3);

        const perpAngle =
          currentAngle + (clockwise ? -Math.PI / 2 : Math.PI / 2);
        centerX = currentX + Math.cos(perpAngle) * radius;
        centerY = currentY + Math.sin(perpAngle) * radius;
        arcStartAngle = perpAngle + Math.PI;

        stepsInArc = Math.ceil(arcLength / 0.025);
        arcProgress = 0;

        x = newX;
        y = newY;
        const tangent = clockwise
          ? arcStartAngle - Math.PI / 2
          : arcStartAngle + Math.PI / 2;
        rotation = (tangent * 180) / Math.PI + 90;

        setTimeout(() => {
          visible = true;
        }, 50);

        const speed = 28 + Math.random() * 12;
        setTimeout(animate, speed);
        return;
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
    class:hidden={!visible}
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

  .flying-airplane.hidden {
    opacity: 0;
    transition: none;
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
