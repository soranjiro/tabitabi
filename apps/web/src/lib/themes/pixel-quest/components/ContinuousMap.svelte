<script lang="ts">
  import type { Step } from "@tabitabi/types";
  import { onMount } from "svelte";
  import {
    groupStepsByDate,
    calculateZones,
    calculateSpotPositions,
    calculateTotalMapWidth,
    generatePath,
    getTerrainColor,
    findCurrentSpotIndex,
    getPlayerPosition,
    generateDecorations,
    type SpotPosition,
    type DayZone,
    type PixelDecoration,
  } from "../utils/layout";
  import SpotMarker from "./SpotMarker.svelte";

  interface GameData {
    coins: number;
    exp: number;
    defeatedMonsters: number[];
    openedChests: number[];
    collectedCoins: number[];
  }

  interface Props {
    steps: Step[];
    selectedStepId?: string | null;
    onSelectStep?: (step: Step) => void;
    mapHeight?: number;
    gameData?: GameData | null;
    onGameDataChange?: (data: GameData) => void;
  }

  let {
    steps,
    selectedStepId = null,
    onSelectStep,
    mapHeight = 280,
    gameData = null,
    onGameDataChange,
  }: Props = $props();

  let scrollContainer: HTMLDivElement | null = $state(null);
  let minimapContainer: HTMLButtonElement | null = $state(null);
  let viewportLeft = $state(0);
  let viewportWidth = $state(800);
  let actualMapHeight = $state(mapHeight);

  let playerX = $state(0);
  let playerY = $state(0);
  let playerHasMoved = $state(false);
  let isPlayerMoving = $state(false);
  let playerDirection = $state<"left" | "right">("right");
  let collectedCoins = $state(gameData?.coins ?? 0);
  let totalExp = $state(gameData?.exp ?? 0);
  let defeatedMonsterIds = $state<number[]>(gameData?.defeatedMonsters ?? []);
  let openedChestIds = $state<number[]>(gameData?.openedChests ?? []);
  let collectedCoinIds = $state<number[]>(gameData?.collectedCoins ?? []);
  let showCoinPopup = $state(false);
  let coinPopupX = $state(0);
  let coinPopupY = $state(0);
  let coinPopupAmount = $state(0);
  let floatingCoins = $state<
    Array<{ id: number; x: number; y: number; collected: boolean }>
  >([]);
  let treasureChests = $state<
    Array<{
      id: number;
      x: number;
      y: number;
      opened: boolean;
      visible: boolean;
    }>
  >([]);
  let showTreasureMessage = $state(false);
  let treasureReward = $state("");
  let monsters = $state<
    Array<{
      id: number;
      x: number;
      y: number;
      type: string;
      defeated: boolean;
      requiredExp: number;
    }>
  >([]);
  let showBattleEffect = $state(false);
  let showBattleResult = $state(false);
  let battleResultText = $state("");
  let battleWon = $state(false);
  let walkingFrame = $state(0);

  const groups = $derived(groupStepsByDate(steps));
  const zones = $derived(calculateZones(groups));
  const positions = $derived(
    calculateSpotPositions(groups, zones, actualMapHeight),
  );
  const totalWidth = $derived(calculateTotalMapWidth(zones));
  const effectiveWidth = $derived(Math.max(totalWidth, viewportWidth));
  const pathD = $derived(generatePath(positions));
  const currentIndex = $derived(findCurrentSpotIndex(positions));
  const basePlayerPos = $derived(getPlayerPosition(positions, currentIndex));
  const allDecorations = $derived(
    zones.flatMap((zone, i) => generateDecorations(zone, i, actualMapHeight)),
  );

  function saveGameData() {
    if (onGameDataChange) {
      onGameDataChange({
        coins: collectedCoins,
        exp: totalExp,
        defeatedMonsters: defeatedMonsterIds,
        openedChests: openedChestIds,
        collectedCoins: collectedCoinIds,
      });
    }
  }

  function generateTreasures() {
    const chests: Array<{
      id: number;
      x: number;
      y: number;
      opened: boolean;
      visible: boolean;
    }> = [];
    zones.forEach((zone, i) => {
      const visible = Math.random() > 0.4;
      chests.push({
        id: i,
        x: zone.startX + Math.random() * (zone.width - 100) + 50,
        y: 60 + Math.random() * (actualMapHeight - 120),
        opened: false,
        visible,
      });
    });
    return chests;
  }

  function generateFloatingCoins() {
    const coins: Array<{
      id: number;
      x: number;
      y: number;
      collected: boolean;
    }> = [];
    zones.forEach((zone, i) => {
      const coinCount = Math.floor(Math.random() * 4);
      for (let j = 0; j < coinCount; j++) {
        coins.push({
          id: i * 10 + j,
          x: zone.startX + Math.random() * (zone.width - 60) + 30,
          y: 80 + Math.random() * (actualMapHeight - 160),
          collected: false,
        });
      }
    });
    return coins;
  }

  function generateMonsters() {
    const spawns: Array<{
      id: number;
      x: number;
      y: number;
      type: string;
      defeated: boolean;
      requiredExp: number;
    }> = [];
    const monsterTypes = ["slime", "bat", "ghost"];
    const expRequirements = { slime: 20, bat: 50, ghost: 100 };
    zones.forEach((zone, i) => {
      if (Math.random() > 0.5) {
        const type =
          monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
        spawns.push({
          id: i * 10 + Math.floor(Math.random() * 10),
          x: zone.startX + Math.random() * (zone.width - 80) + 40,
          y: 80 + Math.random() * (actualMapHeight - 160),
          type,
          defeated: false,
          requiredExp: expRequirements[type as keyof typeof expRequirements],
        });
      }
    });
    return spawns;
  }

  onMount(() => {
    if (basePlayerPos) {
      playerX = basePlayerPos.x;
      playerY = basePlayerPos.y;
    }
    treasureChests = generateTreasures();
    monsters = generateMonsters();
    floatingCoins = generateFloatingCoins();

    openedChestIds.forEach((id) => {
      const chest = treasureChests.find((c) => c.id === id);
      if (chest) chest.opened = true;
    });
    defeatedMonsterIds.forEach((id) => {
      const monster = monsters.find((m) => m.id === id);
      if (monster) monster.defeated = true;
    });
    collectedCoinIds.forEach((id) => {
      const coin = floatingCoins.find((c) => c.id === id);
      if (coin) coin.collected = true;
    });

    const walkInterval = setInterval(() => {
      if (isPlayerMoving) {
        walkingFrame = (walkingFrame + 1) % 2;
      }
    }, 200);

    return () => clearInterval(walkInterval);
  });

  $effect(() => {
    if (basePlayerPos && !playerHasMoved && !isPlayerMoving) {
      playerX = basePlayerPos.x;
      playerY = basePlayerPos.y;
    }
  });

  function handleScroll() {
    if (!scrollContainer) return;
    viewportLeft = scrollContainer.scrollLeft;
    viewportWidth = scrollContainer.clientWidth;
  }

  function updateMapHeight() {
    if (scrollContainer) {
      const height = scrollContainer.clientHeight;
      if (height > 100) {
        actualMapHeight = height;
      }
    }
  }

  $effect(() => {
    if (scrollContainer) {
      viewportWidth = scrollContainer.clientWidth;
      updateMapHeight();
      handleScroll();
    }
  });

  $effect(() => {
    if (!scrollContainer) return;
    const resizeObserver = new ResizeObserver(() => {
      updateMapHeight();
    });
    resizeObserver.observe(scrollContainer);
    return () => resizeObserver.disconnect();
  });

  function handleMinimapClick(e: MouseEvent) {
    if (!minimapContainer || !scrollContainer) return;
    const rect = minimapContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = clickX / rect.width;
    const scrollTo = ratio * totalWidth - viewportWidth / 2;
    scrollContainer.scrollTo({ left: scrollTo, behavior: "smooth" });
  }

  function scrollToSpot(position: SpotPosition) {
    if (!scrollContainer) return;
    const scrollTo = position.x - scrollContainer.clientWidth / 2;
    scrollContainer.scrollTo({ left: scrollTo, behavior: "smooth" });
  }

  function scrollToDate(zone: DayZone) {
    if (!scrollContainer) return;
    scrollContainer.scrollTo({ left: zone.startX - 40, behavior: "smooth" });
  }

  function scrollToNow() {
    if (currentIndex >= 0 && positions[currentIndex]) {
      scrollToSpot(positions[currentIndex]);
    }
  }

  function vibrate(pattern: number | number[]) {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  function handleMapClick(e: MouseEvent | TouchEvent) {
    if (!scrollContainer) return;

    let clientX: number, clientY: number;
    if (e instanceof TouchEvent) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = scrollContainer.getBoundingClientRect();
    const targetX = clientX - rect.left + scrollContainer.scrollLeft;
    const targetY = clientY - rect.top;

    movePlayerTo(targetX, targetY);
  }

  function movePlayerTo(targetX: number, targetY: number) {
    if (isPlayerMoving) return;

    playerHasMoved = true;
    const clampedY = Math.max(60, Math.min(actualMapHeight - 40, targetY));

    playerDirection = targetX > playerX ? "right" : "left";
    isPlayerMoving = true;
    vibrate(10);

    const startX = playerX;
    const startY = playerY;
    const distance = Math.sqrt(
      (targetX - startX) ** 2 + (clampedY - startY) ** 2,
    );
    const duration = Math.min(1500, Math.max(300, distance * 2));
    const startTime = performance.now();

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      playerX = startX + (targetX - startX) * eased;
      playerY = startY + (clampedY - startY) * eased;

      checkCollisions();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isPlayerMoving = false;
        walkingFrame = 0;
      }
    }

    requestAnimationFrame(animate);
  }

  function checkCollisions() {
    treasureChests.forEach((chest, i) => {
      if (
        chest.visible &&
        !chest.opened &&
        Math.abs(playerX - chest.x) < 30 &&
        Math.abs(playerY - chest.y) < 30
      ) {
        openTreasure(i);
      }
    });

    monsters.forEach((monster, i) => {
      if (
        !monster.defeated &&
        Math.abs(playerX - monster.x) < 25 &&
        Math.abs(playerY - monster.y) < 25
      ) {
        battleMonster(i);
      }
    });

    floatingCoins.forEach((coin, i) => {
      if (
        !coin.collected &&
        Math.abs(playerX - coin.x) < 20 &&
        Math.abs(playerY - coin.y) < 20
      ) {
        collectCoin(i);
      }
    });
  }

  function collectCoin(index: number) {
    floatingCoins[index].collected = true;
    collectedCoinIds = [...collectedCoinIds, floatingCoins[index].id];
    vibrate(15);

    const amount = Math.random() > 0.8 ? 3 : 1;
    collectedCoins += amount;
    totalExp += amount * 2;

    coinPopupX = floatingCoins[index].x;
    coinPopupY = floatingCoins[index].y;
    coinPopupAmount = amount;
    showCoinPopup = true;

    setTimeout(() => {
      showCoinPopup = false;
    }, 600);

    saveGameData();
  }

  function openTreasure(index: number) {
    treasureChests[index].opened = true;
    openedChestIds = [...openedChestIds, treasureChests[index].id];
    vibrate([50, 30, 50]);

    const rand = Math.random();
    let coins = 0;
    let exp = 0;

    if (rand < 0.4) {
      coins = 10;
      treasureReward = "10 COINS!";
    } else if (rand < 0.6) {
      coins = 25;
      treasureReward = "25 COINS!!";
    } else if (rand < 0.8) {
      exp = 50;
      treasureReward = "50 EXP!";
    } else {
      coins = 50;
      exp = 100;
      treasureReward = "JACKPOT! 50💰 100✨";
    }

    collectedCoins += coins;
    totalExp += exp + 10;

    showTreasureMessage = true;
    setTimeout(() => {
      showTreasureMessage = false;
    }, 1500);

    saveGameData();
  }

  function battleMonster(index: number) {
    const monster = monsters[index];
    const canDefeat = totalExp >= monster.requiredExp;

    vibrate(canDefeat ? [30, 20, 30, 20, 50] : [100, 50, 100]);
    showBattleEffect = true;

    if (canDefeat) {
      monsters[index].defeated = true;
      defeatedMonsterIds = [...defeatedMonsterIds, monster.id];
      battleWon = true;

      const coins = Math.floor(Math.random() * 8) + 3;
      const exp = Math.floor(Math.random() * 20) + 10;
      collectedCoins += coins;
      totalExp += exp;

      coinPopupX = monster.x;
      coinPopupY = monster.y;
      coinPopupAmount = coins;
      showCoinPopup = true;

      battleResultText = `WIN! +${coins}💰 +${exp}✨`;
    } else {
      battleWon = false;
      const lostCoins = Math.min(
        collectedCoins,
        Math.floor(Math.random() * 5) + 1,
      );
      collectedCoins = Math.max(0, collectedCoins - lostCoins);

      battleResultText = `LOSE... -${lostCoins}💰 (Need ${monster.requiredExp} EXP)`;
    }

    showBattleResult = true;
    setTimeout(() => {
      showBattleEffect = false;
      showCoinPopup = false;
      showBattleResult = false;
    }, 1200);

    saveGameData();
  }

  function handleDpadPress(direction: "up" | "down" | "left" | "right") {
    if (!scrollContainer) return;
    vibrate(5);

    const moveAmount = 60;
    let newX = playerX;
    let newY = playerY;

    switch (direction) {
      case "up":
        newY = Math.max(60, playerY - moveAmount);
        break;
      case "down":
        newY = Math.min(actualMapHeight - 40, playerY + moveAmount);
        break;
      case "left":
        newX = Math.max(40, playerX - moveAmount);
        playerDirection = "left";
        break;
      case "right":
        newX = Math.min(effectiveWidth - 40, playerX + moveAmount);
        playerDirection = "right";
        break;
    }

    movePlayerTo(newX, newY);

    const targetScroll = newX - viewportWidth / 2;
    scrollContainer.scrollTo({ left: targetScroll, behavior: "smooth" });
  }

  $effect(() => {
    if (scrollContainer) {
      viewportWidth = scrollContainer.clientWidth;
      handleScroll();
    }
  });

  export { scrollToDate, scrollToNow };
</script>

<div class="map-container">
  <button
    class="minimap"
    bind:this={minimapContainer}
    onclick={handleMinimapClick}
    aria-label="ミニマップ"
  >
    <div class="minimap-track" style="width: {effectiveWidth}px;">
      {#each zones as zone}
        {@const terrain = getTerrainColor(zone.colorIndex)}
        <div
          class="minimap-zone"
          style="left: {zone.startX}px; width: {zone.width}px; background: {terrain.bg};"
        ></div>
      {/each}
      {#each positions as pos}
        <div
          class="minimap-dot"
          class:current={pos.step.id === selectedStepId}
          style="left: {pos.x}px;"
        ></div>
      {/each}
    </div>
    <div
      class="minimap-viewport"
      style="left: {(viewportLeft / effectiveWidth) *
        100}%; width: {(viewportWidth / effectiveWidth) * 100}%;"
    ></div>
  </button>

  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="map-scroll"
    bind:this={scrollContainer}
    onscroll={handleScroll}
    onclick={handleMapClick}
    role="application"
    aria-label="Game map"
  >
    <div
      class="map-canvas"
      style="width: {effectiveWidth}px; height: {actualMapHeight}px;"
    >
      <svg
        class="map-background"
        width={effectiveWidth}
        height={actualMapHeight}
        viewBox="0 0 {effectiveWidth} {actualMapHeight}"
      >
        <defs>
          <pattern
            id="pixel-grid"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
          >
            <rect
              width="8"
              height="8"
              fill="transparent"
              stroke="rgba(0,0,0,0.06)"
              stroke-width="0.5"
            />
          </pattern>
          <pattern
            id="grass-pattern"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <rect width="16" height="16" fill="#7ec850" />
            <rect x="2" y="10" width="2" height="4" fill="#5b8c3e" />
            <rect x="4" y="12" width="2" height="2" fill="#5b8c3e" />
            <rect x="10" y="8" width="2" height="6" fill="#5b8c3e" />
            <rect x="12" y="10" width="2" height="4" fill="#5b8c3e" />
          </pattern>
          <pattern
            id="forest-pattern"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <rect width="16" height="16" fill="#5b8c3e" />
            <rect x="0" y="12" width="2" height="4" fill="#4a7a2d" />
            <rect x="6" y="10" width="2" height="6" fill="#4a7a2d" />
            <rect x="14" y="8" width="2" height="8" fill="#4a7a2d" />
          </pattern>
          <pattern
            id="sand-pattern"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <rect width="16" height="16" fill="#d4a853" />
            <rect x="2" y="2" width="2" height="2" fill="#c49843" />
            <rect x="10" y="6" width="2" height="2" fill="#c49843" />
            <rect x="6" y="12" width="2" height="2" fill="#c49843" />
          </pattern>
          <pattern
            id="water-pattern"
            width="24"
            height="12"
            patternUnits="userSpaceOnUse"
          >
            <rect width="24" height="12" fill="#5b9bd5" />
            <rect x="0" y="4" width="6" height="2" fill="#7bb8e8" />
            <rect x="10" y="8" width="8" height="2" fill="#7bb8e8" />
            <rect x="18" y="2" width="6" height="2" fill="#7bb8e8" />
          </pattern>
          <pattern
            id="mountain-pattern"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <rect width="16" height="16" fill="#8b7355" />
            <rect x="2" y="4" width="4" height="4" fill="#7a6244" />
            <rect x="10" y="10" width="4" height="4" fill="#7a6244" />
          </pattern>
        </defs>

        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#grass-pattern)"
        />
        <rect x="0" y="0" width="100%" height="100%" fill="url(#pixel-grid)" />

        {#each zones as zone, i}
          {@const terrain = getTerrainColor(zone.colorIndex)}
          {@const patternId = terrain.pattern + "-pattern"}
          <rect
            x={zone.startX}
            y="0"
            width={zone.width}
            height={actualMapHeight}
            fill="url(#{patternId})"
          />
          <rect
            x={zone.startX}
            y="0"
            width={zone.width}
            height={actualMapHeight}
            fill="url(#pixel-grid)"
          />
          {#if i < zones.length - 1}
            <rect
              x={zone.startX + zone.width}
              y="0"
              width="80"
              height={actualMapHeight}
              fill="url(#pixel-grid)"
              opacity="0.5"
            />
            <rect
              x={zone.startX + zone.width + 32}
              y={actualMapHeight / 2 - 24}
              width="16"
              height="48"
              fill="#8e44ad"
              rx="0"
            />
            <rect
              x={zone.startX + zone.width + 36}
              y={actualMapHeight / 2 - 20}
              width="8"
              height="40"
              fill="#9b59b6"
            />
            <text
              x={zone.startX + zone.width + 40}
              y={actualMapHeight / 2 + 40}
              text-anchor="middle"
              fill="#f4e8d3"
              font-size="10"
              font-family="var(--pq-font-pixel)">PORTAL</text
            >
          {/if}
          <rect
            x={zone.startX}
            y="0"
            width={zone.width}
            height="32"
            fill="rgba(0,0,0,0.15)"
          />
          <text
            x={zone.startX + zone.width / 2}
            y="20"
            text-anchor="middle"
            fill="#f4e8d3"
            font-size="12"
            font-family="var(--pq-font-pixel)"
            style="text-shadow: 1px 1px 0 #2d1b0e, -1px -1px 0 #2d1b0e, 1px -1px 0 #2d1b0e, -1px 1px 0 #2d1b0e;"
            >DAY {i + 1}</text
          >
        {/each}

        {#each allDecorations as deco}
          {#if deco.type === "tree"}
            <rect
              x={deco.x}
              y={deco.y + 16}
              width="8"
              height="16"
              fill="#6b4423"
            />
            <rect
              x={deco.x - 8}
              y={deco.y}
              width="24"
              height="20"
              fill="#3d8b3d"
            />
            <rect
              x={deco.x - 4}
              y={deco.y - 8}
              width="16"
              height="12"
              fill="#4a9c4a"
            />
          {:else if deco.type === "bush"}
            <rect x={deco.x} y={deco.y} width="16" height="12" fill="#5b8c3e" />
            <rect
              x={deco.x + 4}
              y={deco.y - 4}
              width="8"
              height="8"
              fill="#6ba34e"
            />
          {:else if deco.type === "rock"}
            <rect
              x={deco.x}
              y={deco.y + 4}
              width="16"
              height="12"
              fill="#8b7355"
            />
            <rect
              x={deco.x + 2}
              y={deco.y}
              width="12"
              height="8"
              fill="#9c846a"
            />
            <rect
              x={deco.x + 4}
              y={deco.y + 2}
              width="4"
              height="4"
              fill="#a89880"
            />
          {:else if deco.type === "flower"}
            <rect
              x={deco.x + 3}
              y={deco.y + 4}
              width="2"
              height="6"
              fill="#4a7a2d"
            />
            <rect x={deco.x} y={deco.y} width="8" height="8" fill="#e85d3b" />
            <rect
              x={deco.x + 2}
              y={deco.y + 2}
              width="4"
              height="4"
              fill="#f0d63e"
            />
          {:else if deco.type === "grass"}
            <rect x={deco.x} y={deco.y} width="2" height="8" fill="#4a7a2d" />
            <rect
              x={deco.x + 4}
              y={deco.y + 2}
              width="2"
              height="6"
              fill="#5b8c3e"
            />
            <rect
              x={deco.x + 8}
              y={deco.y + 1}
              width="2"
              height="7"
              fill="#4a7a2d"
            />
          {:else if deco.type === "cactus"}
            <rect
              x={deco.x + 4}
              y={deco.y}
              width="8"
              height="24"
              fill="#5b8c3e"
            />
            <rect
              x={deco.x}
              y={deco.y + 8}
              width="4"
              height="12"
              fill="#4a7a2d"
            />
            <rect
              x={deco.x + 12}
              y={deco.y + 4}
              width="4"
              height="8"
              fill="#4a7a2d"
            />
          {:else if deco.type === "wave"}
            <rect x={deco.x} y={deco.y} width="8" height="4" fill="#7bb8e8" />
            <rect
              x={deco.x + 12}
              y={deco.y + 2}
              width="6"
              height="3"
              fill="#7bb8e8"
            />
          {:else if deco.type === "cloud"}
            <rect
              x={deco.x}
              y={deco.y}
              width="24"
              height="8"
              fill="rgba(255,255,255,0.6)"
            />
            <rect
              x={deco.x + 4}
              y={deco.y - 4}
              width="16"
              height="8"
              fill="rgba(255,255,255,0.6)"
            />
            <rect
              x={deco.x + 8}
              y={deco.y - 8}
              width="8"
              height="8"
              fill="rgba(255,255,255,0.5)"
            />
          {/if}
        {/each}

        {#if pathD}
          <path d={pathD} fill="none" stroke="#5a4a3a" stroke-width="12" />
          <path d={pathD} fill="none" stroke="#8b7355" stroke-width="8" />
          <path
            d={pathD}
            fill="none"
            stroke="#c4a86c"
            stroke-width="4"
            stroke-dasharray="8 8"
          />
        {/if}
      </svg>

      <div class="map-spots">
        {#each positions as pos, i}
          <SpotMarker
            step={pos.step}
            x={pos.x}
            y={pos.y}
            isSelected={pos.step.id === selectedStepId}
            isCompleted={i <= currentIndex}
            onclick={() => onSelectStep?.(pos.step)}
          />
        {/each}

        {#each treasureChests as chest}
          {#if chest.visible && !chest.opened}
            <button
              class="treasure-chest"
              style="left: {chest.x}px; top: {chest.y}px;"
              onclick={() => openTreasure(chest.id)}
              aria-label="Open treasure"
            >
              <div class="chest-body"></div>
              <div class="chest-lid"></div>
              <div class="chest-lock"></div>
            </button>
          {:else if chest.visible && chest.opened}
            <div
              class="treasure-chest opened"
              style="left: {chest.x}px; top: {chest.y}px;"
            >
              <div class="chest-body"></div>
              <div class="chest-lid-open"></div>
            </div>
          {/if}
        {/each}

        {#each floatingCoins as coin}
          {#if !coin.collected}
            <button
              class="floating-coin"
              style="left: {coin.x}px; top: {coin.y}px;"
              onclick={() => collectCoin(floatingCoins.indexOf(coin))}
              aria-label="Collect coin"
            >
              💰
            </button>
          {/if}
        {/each}

        {#each monsters as monster}
          {#if !monster.defeated}
            <button
              class="monster monster-{monster.type}"
              style="left: {monster.x}px; top: {monster.y}px;"
              onclick={() => battleMonster(monsters.indexOf(monster))}
              aria-label="Battle monster (Need {monster.requiredExp} EXP)"
              title="Need {monster.requiredExp} EXP"
            >
              <span class="monster-exp-req">{monster.requiredExp}</span>
              {#if monster.type === "slime"}
                <div class="slime-body"></div>
              {:else if monster.type === "bat"}
                <div class="bat-body"></div>
                <div class="bat-wing left"></div>
                <div class="bat-wing right"></div>
                <div class="bat-eye left"></div>
                <div class="bat-eye right"></div>
              {:else}
                <div class="ghost-body"></div>
                <div class="ghost-eye left"></div>
                <div class="ghost-eye right"></div>
              {/if}
            </button>
          {/if}
        {/each}

        {#if showCoinPopup}
          <div
            class="coin-popup"
            style="left: {coinPopupX}px; top: {coinPopupY}px;"
          >
            +{coinPopupAmount}
          </div>
        {/if}

        <div
          class="player-marker"
          class:moving={isPlayerMoving}
          class:flip={playerDirection === "left"}
          style="left: {playerX}px; top: {playerY}px;"
        >
          <div class="player-sprite walk-{walkingFrame}">
            <div class="player-hair"></div>
            <div class="player-face"></div>
            <div class="player-body"></div>
            <div class="player-legs"></div>
          </div>
          <div class="player-shadow"></div>
          <div class="player-indicator"></div>
        </div>

        {#if showBattleEffect}
          <div
            class="battle-effect"
            style="left: {playerX}px; top: {playerY - 20}px;"
          >
            <span class="battle-star">★</span>
            <span class="battle-pow">POW!</span>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="game-hud">
    <div class="coin-display">
      <div class="coin-icon"></div>
      <span class="coin-count">{collectedCoins}</span>
    </div>
    <div class="exp-display">
      <span class="exp-icon">✨</span>
      <span class="exp-count">{totalExp} EXP</span>
    </div>
  </div>

  <div class="dpad-container">
    <button
      class="dpad-btn dpad-up"
      onclick={() => handleDpadPress("up")}
      aria-label="Move up"
    ></button>
    <button
      class="dpad-btn dpad-left"
      onclick={() => handleDpadPress("left")}
      aria-label="Move left"
    ></button>
    <div class="dpad-center"></div>
    <button
      class="dpad-btn dpad-right"
      onclick={() => handleDpadPress("right")}
      aria-label="Move right"
    ></button>
    <button
      class="dpad-btn dpad-down"
      onclick={() => handleDpadPress("down")}
      aria-label="Move down"
    ></button>
  </div>

  {#if currentIndex >= 0}
    <button class="now-button" onclick={scrollToNow} aria-label="現在地へ移動">
      NOW
    </button>
  {/if}

  {#if showTreasureMessage}
    <div class="treasure-message">
      <div class="treasure-icon">🎁</div>
      <div class="treasure-text">YOU GOT</div>
      <div class="treasure-reward">{treasureReward}</div>
    </div>
  {/if}

  {#if showBattleResult}
    <div class="battle-result" class:win={battleWon} class:lose={!battleWon}>
      <div class="battle-result-text">{battleResultText}</div>
    </div>
  {/if}
</div>

<style>
  .map-container {
    position: relative;
    background: var(--pq-bg-dark);
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .minimap {
    height: 20px;
    background: var(--pq-bg-dark);
    border: none;
    border-bottom: 2px solid var(--pq-border-outer);
    position: relative;
    cursor: pointer;
    overflow: hidden;
    width: 100%;
    padding: 0;
    flex-shrink: 0;
  }

  .minimap-track {
    height: 100%;
    position: relative;
    transform-origin: left center;
    transform: scaleX(calc(100% / var(--total-width, 1)));
  }

  .minimap-zone {
    position: absolute;
    top: 0;
    height: 100%;
  }

  .minimap-dot {
    position: absolute;
    top: 50%;
    width: 4px;
    height: 4px;
    background: var(--pq-text-primary);
    border-radius: 50%;
    transform: translate(-50%, -50%);
  }

  .minimap-dot.current {
    background: var(--pq-ui-gold);
    width: 6px;
    height: 6px;
  }

  .minimap-viewport {
    position: absolute;
    top: 2px;
    height: 16px;
    background: rgba(255, 215, 0, 0.3);
    border: 2px solid var(--pq-ui-gold);
    pointer-events: none;
    min-width: 20px;
  }

  .map-scroll {
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: #6b5344 #2d1b0e;
    min-height: 0;
  }

  .map-scroll::-webkit-scrollbar {
    height: 8px;
  }

  .map-scroll::-webkit-scrollbar-track {
    background: var(--pq-bg-dark);
  }

  .map-scroll::-webkit-scrollbar-thumb {
    background: var(--pq-bg-light);
    border-radius: 4px;
  }

  .map-canvas {
    position: relative;
    min-width: 100%;
    min-height: 100%;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
  }

  .map-canvas::after {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 2px,
      rgba(0, 0, 0, 0.03) 2px,
      rgba(0, 0, 0, 0.03) 4px
    );
  }

  .map-background {
    position: absolute;
    top: 0;
    left: 0;
    shape-rendering: crispEdges;
  }

  .map-spots {
    position: absolute;
    inset: 0;
  }

  .player-marker {
    position: absolute;
    transform: translate(-50%, -100%);
    z-index: 40;
    pointer-events: none;
    animation: player-bounce 0.5s ease-in-out infinite;
  }

  .player-sprite {
    width: 24px;
    height: 32px;
    position: relative;
    image-rendering: pixelated;
  }

  .player-hair {
    position: absolute;
    top: 0;
    left: 4px;
    width: 16px;
    height: 6px;
    background: #8b4513;
    border-radius: 4px 4px 0 0;
  }

  .player-face {
    position: absolute;
    top: 4px;
    left: 5px;
    width: 14px;
    height: 10px;
    background: #f4c898;
    border-radius: 2px;
  }

  .player-face::before {
    content: "";
    position: absolute;
    top: 3px;
    left: 2px;
    width: 3px;
    height: 3px;
    background: #2c1810;
    box-shadow: 7px 0 0 #2c1810;
    border-radius: 1px;
  }

  .player-face::after {
    content: "";
    position: absolute;
    bottom: 1px;
    left: 50%;
    transform: translateX(-50%);
    width: 4px;
    height: 2px;
    background: #e08080;
    border-radius: 0 0 2px 2px;
  }

  .player-body {
    position: absolute;
    top: 12px;
    left: 4px;
    width: 16px;
    height: 12px;
    background: linear-gradient(180deg, #4a90d9 0%, #3a7bc8 100%);
    border-radius: 2px;
  }

  .player-body::before,
  .player-body::after {
    content: "";
    position: absolute;
    top: 2px;
    width: 6px;
    height: 10px;
    background: #f4c898;
    border-radius: 2px;
  }

  .player-body::before {
    left: -5px;
    animation: arm-swing 0.5s ease-in-out infinite;
  }

  .player-body::after {
    right: -5px;
    animation: arm-swing 0.5s ease-in-out infinite reverse;
  }

  @keyframes arm-swing {
    0%,
    100% {
      transform: rotate(0deg);
    }
    50% {
      transform: rotate(5deg);
    }
  }

  .player-legs {
    position: absolute;
    top: 24px;
    left: 6px;
    width: 5px;
    height: 8px;
    background: #5b3c11;
    box-shadow: 7px 0 0 #5b3c11;
    border-radius: 0 0 2px 2px;
  }

  .player-shadow {
    width: 18px;
    height: 6px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 50%;
    margin: 2px auto 0;
    animation: shadow-pulse 0.5s ease-in-out infinite;
  }

  @keyframes shadow-pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 0.3;
    }
    50% {
      transform: scale(0.9);
      opacity: 0.4;
    }
  }

  .player-indicator {
    position: absolute;
    top: -16px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 8px solid var(--pq-ui-gold);
    animation: indicator-bounce 0.8s ease-in-out infinite;
    filter: drop-shadow(0 0 4px rgba(255, 215, 0, 0.6));
  }

  @keyframes indicator-bounce {
    0%,
    100% {
      transform: translateX(-50%) translateY(0);
    }
    50% {
      transform: translateX(-50%) translateY(-4px);
    }
  }

  @keyframes player-bounce {
    0%,
    100% {
      transform: translate(-50%, -100%);
    }
    50% {
      transform: translate(-50%, calc(-100% - 4px));
    }
  }

  .now-button {
    position: absolute;
    bottom: 12px;
    right: 12px;
    background: linear-gradient(180deg, #ffd700 0%, #ffb300 100%);
    color: var(--pq-text-dark);
    border: 2px solid var(--pq-border-outer);
    padding: 6px 12px;
    font-family: var(--pq-font-pixel);
    font-size: 0.75rem;
    font-weight: bold;
    cursor: pointer;
    box-shadow:
      2px 2px 0 var(--pq-border-outer),
      0 0 10px rgba(255, 215, 0, 0.4);
    z-index: 50;
    animation: now-pulse 2s ease-in-out infinite;
  }

  @keyframes now-pulse {
    0%,
    100% {
      box-shadow:
        2px 2px 0 var(--pq-border-outer),
        0 0 10px rgba(255, 215, 0, 0.4);
    }
    50% {
      box-shadow:
        2px 2px 0 var(--pq-border-outer),
        0 0 20px rgba(255, 215, 0, 0.7);
    }
  }

  .now-button:hover {
    transform: translate(-1px, -1px);
    box-shadow: 3px 3px 0 var(--pq-border-outer);
  }

  .now-button:active {
    transform: translate(1px, 1px);
    box-shadow: 1px 1px 0 var(--pq-border-outer);
  }

  @media (min-width: 768px) {
    .minimap {
      height: 32px;
    }

    .minimap-viewport {
      top: 4px;
      height: 24px;
    }
  }

  .treasure-chest {
    position: absolute;
    width: 28px;
    height: 24px;
    cursor: pointer;
    transform: translate(-50%, -50%);
    transition: transform 0.2s;
    z-index: 25;
  }

  .treasure-chest:hover {
    transform: translate(-50%, -50%) scale(1.1);
  }

  .chest-body {
    position: absolute;
    bottom: 0;
    left: 2px;
    width: 24px;
    height: 14px;
    background: linear-gradient(180deg, #8b4513 0%, #654321 100%);
    border: 2px solid #3d2817;
    border-radius: 2px;
  }

  .chest-body::before {
    content: "";
    position: absolute;
    top: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 8px;
    background: #ffd700;
    border: 1px solid #b8860b;
    border-radius: 1px;
  }

  .chest-lid {
    position: absolute;
    top: 0;
    left: 0;
    width: 28px;
    height: 12px;
    background: linear-gradient(180deg, #a0522d 0%, #8b4513 100%);
    border: 2px solid #3d2817;
    border-radius: 4px 4px 0 0;
    transform-origin: bottom center;
    transition: transform 0.3s ease-out;
  }

  .chest-lid-open {
    transform: rotateX(-120deg);
  }

  .chest-lock {
    position: absolute;
    bottom: -2px;
    left: 50%;
    transform: translateX(-50%);
    width: 6px;
    height: 4px;
    background: #ffd700;
    border: 1px solid #b8860b;
    border-radius: 0 0 2px 2px;
  }

  .chest-sparkle {
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.6rem;
    animation: sparkle-float 1s ease-in-out infinite;
  }

  @keyframes chest-bounce {
    0%,
    100% {
      transform: translate(-50%, -50%);
    }
    50% {
      transform: translate(-50%, calc(-50% - 3px));
    }
  }

  .monster {
    position: absolute;
    width: 32px;
    height: 32px;
    cursor: pointer;
    transform: translate(-50%, -50%);
    z-index: 20;
  }

  .monster:active {
    transform: translate(-50%, -50%) scale(0.9);
  }

  .monster-exp-req {
    position: absolute;
    top: -14px;
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--pq-font-pixel);
    font-size: 0.6rem;
    font-weight: bold;
    color: #ff6b6b;
    background: rgba(0, 0, 0, 0.7);
    padding: 1px 4px;
    border-radius: 3px;
    white-space: nowrap;
  }

  .monster.defeated {
    animation: monster-defeat 0.3s ease-out forwards;
  }

  @keyframes monster-defeat {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translate(-50%, -80%) scale(0.5);
    }
  }

  .monster-slime .slime-body {
    position: absolute;
    bottom: 4px;
    left: 4px;
    width: 24px;
    height: 18px;
    background: radial-gradient(ellipse at 30% 30%, #7cfc00 0%, #228b22 80%);
    border-radius: 50% 50% 40% 40%;
  }

  .monster-slime .slime-body::before,
  .monster-slime .slime-body::after {
    content: "";
    position: absolute;
    top: 6px;
    width: 5px;
    height: 5px;
    background: #000;
    border-radius: 50%;
  }

  .monster-slime .slime-body::before {
    left: 5px;
  }

  .monster-slime .slime-body::after {
    right: 5px;
  }

  .monster-bat .bat-body {
    position: absolute;
    top: 10px;
    left: 10px;
    width: 12px;
    height: 10px;
    background: #4b0082;
    border-radius: 50%;
  }

  .monster-bat .bat-wing {
    position: absolute;
    top: 8px;
    width: 12px;
    height: 16px;
    background: #8a2be2;
    border-radius: 50% 50% 20% 20%;
  }

  .monster-bat .bat-wing.left {
    left: 0;
    transform-origin: right center;
  }

  .monster-bat .bat-wing.right {
    right: 0;
    transform-origin: left center;
  }

  @keyframes bat-fly {
    0% {
      transform: rotate(-20deg);
    }
    100% {
      transform: rotate(20deg);
    }
  }

  .monster-bat .bat-eye {
    position: absolute;
    top: 12px;
    width: 3px;
    height: 3px;
    background: #ff0000;
    border-radius: 50%;
  }

  .monster-bat .bat-eye.left {
    left: 11px;
  }

  .monster-bat .bat-eye.right {
    right: 11px;
  }

  .monster-ghost .ghost-body {
    position: absolute;
    top: 4px;
    left: 6px;
    width: 20px;
    height: 24px;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.9) 0%,
      rgba(200, 200, 255, 0.7) 100%
    );
    border-radius: 50% 50% 0 0;
  }

  .monster-ghost .ghost-body::after {
    content: "";
    position: absolute;
    bottom: -4px;
    left: 0;
    width: 100%;
    height: 8px;
    background: inherit;
    clip-path: polygon(0% 0%, 25% 100%, 50% 0%, 75% 100%, 100% 0%);
  }

  .monster-ghost .ghost-eye {
    position: absolute;
    top: 10px;
    width: 4px;
    height: 6px;
    background: #000;
    border-radius: 50%;
  }

  .monster-ghost .ghost-eye.left {
    left: 10px;
  }

  .monster-ghost .ghost-eye.right {
    right: 10px;
  }

  .battle-result {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 16px 24px;
    border-radius: 8px;
    font-family: var(--pq-font-pixel);
    font-size: 1rem;
    font-weight: bold;
    text-align: center;
    z-index: 200;
    animation: result-pop 0.3s ease-out;
  }

  .battle-result.win {
    background: linear-gradient(180deg, #228b22 0%, #006400 100%);
    border: 3px solid #32cd32;
    color: #fff;
    box-shadow: 0 0 20px rgba(50, 205, 50, 0.5);
  }

  .battle-result.lose {
    background: linear-gradient(180deg, #8b0000 0%, #640000 100%);
    border: 3px solid #ff4444;
    color: #fff;
    box-shadow: 0 0 20px rgba(255, 68, 68, 0.5);
  }

  @keyframes result-pop {
    0% {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 0;
    }
    100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }

  .dpad-container {
    position: fixed;
    bottom: 20px;
    left: 20px;
    display: grid;
    grid-template-columns: 48px 48px 48px;
    grid-template-rows: 48px 48px 48px;
    grid-template-areas:
      ". up ."
      "left center right"
      ". down .";
    gap: 4px;
    z-index: 100;
    opacity: 0.95;
  }

  .dpad-btn {
    width: 48px;
    height: 48px;
    background: linear-gradient(145deg, #555 0%, #333 100%);
    border: 3px solid #222;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    user-select: none;
    touch-action: manipulation;
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.2),
      0 3px 6px rgba(0, 0, 0, 0.5);
    color: #fff;
    font-size: 1.2rem;
  }

  .dpad-btn:active {
    background: linear-gradient(145deg, #444 0%, #222 100%);
    transform: scale(0.9);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.1),
      0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .dpad-up {
    grid-area: up;
  }
  .dpad-up::after {
    content: "▲";
  }

  .dpad-down {
    grid-area: down;
  }
  .dpad-down::after {
    content: "▼";
  }

  .dpad-left {
    grid-area: left;
  }
  .dpad-left::after {
    content: "◀";
  }

  .dpad-right {
    grid-area: right;
  }
  .dpad-right::after {
    content: "▶";
  }

  .dpad-center {
    grid-area: center;
    width: 48px;
    height: 48px;
    background: linear-gradient(145deg, #444 0%, #333 100%);
    border: 3px solid #222;
    border-radius: 50%;
  }

  .game-hud {
    position: fixed;
    bottom: 20px;
    right: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 100;
  }

  .coin-display {
    display: flex;
    align-items: center;
    gap: 8px;
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0.8) 0%,
      rgba(30, 30, 30, 0.9) 100%
    );
    border: 2px solid var(--pq-border-outer);
    border-radius: 8px;
    padding: 8px 14px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  .exp-display {
    display: flex;
    align-items: center;
    gap: 6px;
    background: linear-gradient(
      180deg,
      rgba(60, 20, 80, 0.9) 0%,
      rgba(40, 10, 60, 0.95) 100%
    );
    border: 2px solid #9932cc;
    border-radius: 8px;
    padding: 6px 12px;
    box-shadow: 0 2px 8px rgba(153, 50, 204, 0.3);
  }

  .exp-icon {
    font-size: 1rem;
    animation: exp-glow 1.5s ease-in-out infinite;
  }

  @keyframes exp-glow {
    0%,
    100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.5) drop-shadow(0 0 4px #ffd700);
    }
  }

  .exp-count {
    font-family: var(--pq-font-pixel);
    font-size: 0.85rem;
    font-weight: bold;
    color: #dda0dd;
    text-shadow: 1px 1px 0 #000;
  }

  .floating-coin {
    position: absolute;
    transform: translate(-50%, -50%);
    font-size: 1.2rem;
    background: none;
    border: none;
    cursor: pointer;
    z-index: 15;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
    transition: transform 0.2s ease;
  }

  .floating-coin:hover {
    transform: translate(-50%, -50%) scale(1.2);
  }

  .coin-icon {
    width: 20px;
    height: 20px;
    background: radial-gradient(circle at 30% 30%, #ffd700 0%, #b8860b 70%);
    border-radius: 50%;
    border: 2px solid #8b6914;
    position: relative;
  }

  .coin-icon::after {
    content: "★";
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.6rem;
    color: #8b6914;
  }

  .coin-count {
    font-family: var(--pq-font-pixel);
    font-size: 1rem;
    font-weight: bold;
    color: #ffd700;
    text-shadow: 1px 1px 0 #000;
  }

  .coin-popup {
    position: absolute;
    font-family: var(--pq-font-pixel);
    font-size: 1rem;
    font-weight: bold;
    color: #ffd700;
    text-shadow:
      1px 1px 0 #000,
      -1px -1px 0 #000;
    animation: coin-popup 1s ease-out forwards;
    z-index: 60;
    pointer-events: none;
  }

  @keyframes coin-popup {
    0% {
      transform: translateY(0) scale(1);
      opacity: 1;
    }
    100% {
      transform: translateY(-40px) scale(1.3);
      opacity: 0;
    }
  }

  .battle-effect {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 0, 0.15);
    z-index: 200;
    animation: battle-flash 0.5s ease-out forwards;
    pointer-events: none;
  }

  @keyframes battle-flash {
    0% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  .battle-star {
    position: absolute;
    font-size: 3rem;
    animation: star-burst 0.5s ease-out forwards;
  }

  .battle-star:nth-child(1) {
    transform: translate(-50px, -50px) rotate(0deg);
  }
  .battle-star:nth-child(2) {
    transform: translate(50px, -30px) rotate(72deg);
  }
  .battle-star:nth-child(3) {
    transform: translate(60px, 40px) rotate(144deg);
  }
  .battle-star:nth-child(4) {
    transform: translate(-40px, 50px) rotate(216deg);
  }
  .battle-star:nth-child(5) {
    transform: translate(0px, -60px) rotate(288deg);
  }

  @keyframes star-burst {
    0% {
      transform: scale(0) rotate(0deg);
      opacity: 1;
    }
    50% {
      transform: scale(1.5) rotate(180deg);
      opacity: 1;
    }
    100% {
      transform: scale(2) rotate(360deg);
      opacity: 0;
    }
  }

  .battle-pow {
    font-family: var(--pq-font-pixel);
    font-size: 3rem;
    font-weight: bold;
    color: #ff4444;
    text-shadow:
      3px 3px 0 #000,
      -1px -1px 0 #ff8800,
      2px -1px 0 #ffff00;
    animation: pow-pop 0.5s ease-out forwards;
    z-index: 1;
  }

  @keyframes pow-pop {
    0% {
      transform: scale(0) rotate(-10deg);
    }
    50% {
      transform: scale(1.3) rotate(5deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 0;
    }
  }

  .treasure-message {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(180deg, #2a1a0a 0%, #1a0f05 100%);
    border: 4px solid #8b4513;
    border-radius: 8px;
    padding: 24px 32px;
    text-align: center;
    z-index: 200;
    box-shadow:
      0 0 20px rgba(255, 215, 0, 0.5),
      inset 0 0 20px rgba(255, 215, 0, 0.1);
    animation: treasure-appear 0.3s ease-out;
  }

  @keyframes treasure-appear {
    0% {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 0;
    }
    100% {
      transform: translate(-50%, -50%) scale(1);
      opacity: 1;
    }
  }

  .treasure-icon {
    font-size: 3rem;
    margin-bottom: 12px;
    animation: treasure-shine 1s ease-in-out infinite;
  }

  @keyframes treasure-shine {
    0%,
    100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.3) drop-shadow(0 0 10px gold);
    }
  }

  .treasure-text {
    font-family: var(--pq-font-pixel);
    font-size: 1rem;
    color: #ffd700;
    text-shadow: 1px 1px 0 #000;
    margin-bottom: 8px;
  }

  .treasure-reward {
    font-family: var(--pq-font-pixel);
    font-size: 1.25rem;
    font-weight: bold;
    color: #fff;
    text-shadow: 2px 2px 0 #8b4513;
  }

  .player-marker.moving {
    animation: player-walk 0.4s steps(4) infinite;
  }

  @keyframes player-walk {
    0% {
      transform: translate(-50%, -50%) translateY(0);
    }
    25% {
      transform: translate(-50%, -50%) translateY(-2px);
    }
    50% {
      transform: translate(-50%, -50%) translateY(0);
    }
    75% {
      transform: translate(-50%, -50%) translateY(-2px);
    }
    100% {
      transform: translate(-50%, -50%) translateY(0);
    }
  }

  .player-marker.flip {
    transform: translate(-50%, -50%) scaleX(-1);
  }

  .player-marker.moving.flip {
    animation: player-walk-flip 0.4s steps(4) infinite;
  }

  @keyframes player-walk-flip {
    0% {
      transform: translate(-50%, -50%) scaleX(-1) translateY(0);
    }
    25% {
      transform: translate(-50%, -50%) scaleX(-1) translateY(-2px);
    }
    50% {
      transform: translate(-50%, -50%) scaleX(-1) translateY(0);
    }
    75% {
      transform: translate(-50%, -50%) scaleX(-1) translateY(-2px);
    }
    100% {
      transform: translate(-50%, -50%) scaleX(-1) translateY(0);
    }
  }

  @media (min-width: 768px) {
    .dpad-container {
      display: none;
    }
  }
</style>
