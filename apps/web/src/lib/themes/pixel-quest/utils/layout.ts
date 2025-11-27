import type { Step } from "@tabitabi/types";

export interface SpotPosition {
  x: number;
  y: number;
  step: Step;
  zoneIndex: number;
}

export interface DayZone {
  date: string;
  startX: number;
  width: number;
  colorIndex: number;
}

const SPOT_SPACING = 120;
const ZONE_PADDING = 60;
const PORTAL_WIDTH = 80;

const TERRAIN_COLORS = [
  { bg: "#7ec850", pattern: "grass" },
  { bg: "#5b8c3e", pattern: "forest" },
  { bg: "#d4a853", pattern: "sand" },
  { bg: "#5b9bd5", pattern: "water" },
  { bg: "#8b7355", pattern: "mountain" },
];

export function getTerrainColor(index: number): { bg: string; pattern: string } {
  return TERRAIN_COLORS[index % TERRAIN_COLORS.length];
}

export function groupStepsByDate(steps: Step[]): Map<string, Step[]> {
  const groups = new Map<string, Step[]>();
  for (const step of steps) {
    const date = step.date;
    if (!groups.has(date)) {
      groups.set(date, []);
    }
    groups.get(date)!.push(step);
  }
  for (const [_, groupSteps] of groups) {
    groupSteps.sort((a, b) => a.time.localeCompare(b.time));
  }
  return groups;
}

export function getSortedDates(groups: Map<string, Step[]>): string[] {
  return Array.from(groups.keys()).sort();
}

export function calculateZones(groups: Map<string, Step[]>): DayZone[] {
  const dates = getSortedDates(groups);
  const zones: DayZone[] = [];
  let currentX = ZONE_PADDING;

  dates.forEach((date, index) => {
    const stepsInDay = groups.get(date) || [];
    const zoneWidth = Math.max(stepsInDay.length * SPOT_SPACING, SPOT_SPACING) + ZONE_PADDING;

    zones.push({
      date,
      startX: currentX,
      width: zoneWidth,
      colorIndex: index,
    });

    currentX += zoneWidth + (index < dates.length - 1 ? PORTAL_WIDTH : 0);
  });

  return zones;
}

export function calculateSpotPositions(
  groups: Map<string, Step[]>,
  zones: DayZone[],
  mapHeight: number
): SpotPosition[] {
  const positions: SpotPosition[] = [];
  const yPositions = [0.3, 0.7, 0.3, 0.7];

  zones.forEach((zone, zoneIndex) => {
    const stepsInDay = groups.get(zone.date) || [];
    const spotStartX = zone.startX + ZONE_PADDING / 2;

    stepsInDay.forEach((step, stepIndex) => {
      const x = spotStartX + stepIndex * SPOT_SPACING;
      const yRatio = yPositions[stepIndex % yPositions.length];
      const y = mapHeight * yRatio;

      positions.push({
        x,
        y,
        step,
        zoneIndex,
      });
    });
  });

  return positions;
}

export function calculateTotalMapWidth(zones: DayZone[]): number {
  if (zones.length === 0) return 400;
  const lastZone = zones[zones.length - 1];
  return lastZone.startX + lastZone.width + ZONE_PADDING;
}

const PIXEL_GRID = 8;

function snapToGrid(v: number): number {
  return Math.round(v / PIXEL_GRID) * PIXEL_GRID;
}

export function generatePath(positions: SpotPosition[]): string {
  if (positions.length < 2) return "";

  const p0 = positions[0];
  let path = `M ${snapToGrid(p0.x)} ${snapToGrid(p0.y)}`;

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1];
    const curr = positions[i];
    const prevX = snapToGrid(prev.x);
    const prevY = snapToGrid(prev.y);
    const currX = snapToGrid(curr.x);
    const currY = snapToGrid(curr.y);

    const midX = snapToGrid((prevX + currX) / 2);
    path += ` L ${midX} ${prevY} L ${midX} ${currY} L ${currX} ${currY}`;
  }

  return path;
}

export interface PixelDecoration {
  type: "tree" | "bush" | "rock" | "flower" | "grass" | "cactus" | "wave" | "cloud";
  x: number;
  y: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function generateDecorations(zone: DayZone, zoneIndex: number, mapHeight: number): PixelDecoration[] {
  const decorations: PixelDecoration[] = [];
  const random = seededRandom(zoneIndex * 1000 + zone.startX);
  const terrain = getTerrainColor(zone.colorIndex);

  const numDecos = 10 + Math.floor(random() * 8);

  for (let i = 0; i < numDecos; i++) {
    const x = snapToGrid(zone.startX + 24 + random() * (zone.width - 48));
    const y = snapToGrid(24 + random() * (mapHeight - 80));

    let type: PixelDecoration["type"];
    const roll = random();

    if (terrain.pattern === "grass") {
      type = roll < 0.25 ? "tree" : roll < 0.45 ? "bush" : roll < 0.6 ? "flower" : "grass";
    } else if (terrain.pattern === "forest") {
      type = roll < 0.5 ? "tree" : roll < 0.7 ? "bush" : "rock";
    } else if (terrain.pattern === "sand") {
      type = roll < 0.3 ? "cactus" : roll < 0.5 ? "rock" : "grass";
    } else if (terrain.pattern === "water") {
      type = "wave";
    } else {
      type = roll < 0.5 ? "rock" : "bush";
    }

    decorations.push({ type, x, y });
  }

  const numClouds = 2 + Math.floor(random() * 3);
  for (let i = 0; i < numClouds; i++) {
    const x = snapToGrid(zone.startX + random() * zone.width);
    const y = snapToGrid(8 + random() * 32);
    decorations.push({ type: "cloud", x, y });
  }

  return decorations;
}

export type IconCategory = "train" | "food" | "home" | "flag" | "shop" | "pin";

const CATEGORY_KEYWORDS: Record<IconCategory, string[]> = {
  train: ["駅", "空港", "バス", "電車", "新幹線", "フライト", "飛行機", "タクシー"],
  food: ["レストラン", "ランチ", "カフェ", "朝食", "夕食", "ディナー", "食事", "ごはん"],
  home: ["ホテル", "旅館", "チェックイン", "宿", "民宿", "ゲストハウス"],
  flag: ["神社", "城", "美術館", "寺", "観光", "見学", "公園", "庭園"],
  shop: ["ショッピング", "お土産", "買い物", "モール", "市場", "商店"],
  pin: [],
};

export function getIconCategory(step: Step): IconCategory {
  const text = `${step.title} ${step.location || ""} ${step.notes || ""}`.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (category === "pin") continue;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return category as IconCategory;
      }
    }
  }

  return "pin";
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = weekdays[date.getDay()];
  return `${month}/${day}(${weekday})`;
}

export function getDayNumber(date: string, allDates: string[]): number {
  const sortedDates = [...new Set(allDates)].sort();
  return sortedDates.indexOf(date) + 1;
}

export function findCurrentSpotIndex(positions: SpotPosition[]): number {
  if (positions.length === 0) return -1;

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  for (let i = positions.length - 1; i >= 0; i--) {
    const pos = positions[i];
    if (pos.step.date < today) return i;
    if (pos.step.date === today && pos.step.time <= currentTime) return i;
  }

  return -1;
}

export function getPlayerPosition(
  positions: SpotPosition[],
  currentIndex: number
): { x: number; y: number } | null {
  if (currentIndex < 0 || positions.length === 0) return null;

  if (currentIndex >= positions.length - 1) {
    return { x: positions[positions.length - 1].x, y: positions[positions.length - 1].y };
  }

  const current = positions[currentIndex];
  const next = positions[currentIndex + 1];

  const now = new Date();
  const currentDateTime = new Date(`${current.step.date}T${current.step.time}`);
  const nextDateTime = new Date(`${next.step.date}T${next.step.time}`);

  const totalMs = nextDateTime.getTime() - currentDateTime.getTime();
  const elapsedMs = now.getTime() - currentDateTime.getTime();
  const progress = Math.min(Math.max(elapsedMs / totalMs, 0), 1);

  return {
    x: current.x + (next.x - current.x) * progress,
    y: current.y + (next.y - current.y) * progress,
  };
}
