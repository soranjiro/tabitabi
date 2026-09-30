import type { Step } from "@tabitabi/types";
import { ITINERARY_BACKGROUND_URLS } from "$lib/itinerary-backgrounds";

export const DEFAULT_ITINERARY_COVER_IMAGE = "/itinerary-backgrounds/japanese.avif";

const THEME_COVER_IMAGES: Readonly<Record<string, string>> = {
  daycard: "/hero/background-spring.avif",
  list: "/hero/background-summer.avif",
  week: "/hero/background-autumn.avif",
  month: "/hero/background-winter.avif",
  "map-only": "/itinerary-backgrounds/coastal-drive.avif",
  "mapbox-journey": "/itinerary-backgrounds/sky.avif",
  shopping: "/itinerary-backgrounds/food.webp",
};

type CoverItinerary = {
  theme_id: string;
  background_image?: string | null;
};

export function resolveItineraryCoverImage(itinerary: CoverItinerary): string {
  if (
    itinerary.background_image &&
    ITINERARY_BACKGROUND_URLS.has(
      itinerary.background_image as (typeof ITINERARY_BACKGROUND_URLS extends Set<infer T> ? T : never),
    )
  ) {
    return itinerary.background_image;
  }

  return THEME_COVER_IMAGES[itinerary.theme_id] ?? DEFAULT_ITINERARY_COVER_IMAGE;
}

const TOKYO_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatTokyoDate(timestamp: number): string {
  const parts = TOKYO_DATE_FORMATTER.formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}.${month}.${day}`;
}

export function getItineraryDateRange(
  steps: Array<Pick<Step, "start_at" | "end_at">>,
): { startAt: number; endAt: number } | null {
  const starts = steps
    .map((step) => step.start_at)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  if (!starts.length) return null;

  const ends = steps
    .map((step) => step.end_at)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  return {
    startAt: Math.min(...starts),
    endAt: ends.length ? Math.max(...ends) : Math.max(...starts),
  };
}

export function formatItineraryDateRange(
  steps: Array<Pick<Step, "start_at" | "end_at">>,
): string | null {
  const range = getItineraryDateRange(steps);
  if (!range) return null;

  const start = formatTokyoDate(range.startAt);
  const end = formatTokyoDate(range.endAt);
  return start === end ? start : `${start} — ${end}`;
}

export function getItineraryOgVersion(
  itinerary: { updated_at: string },
  steps: Array<Pick<Step, "updated_at">>,
): string {
  let latest = Date.parse(itinerary.updated_at);
  if (!Number.isFinite(latest)) latest = 0;

  for (const step of steps) {
    const updated = Date.parse(step.updated_at);
    if (Number.isFinite(updated)) latest = Math.max(latest, updated);
  }

  return Math.max(0, latest).toString(36);
}

function glyphUnits(char: string): number {
  if (/^[\u0000-\u007f]$/.test(char)) {
    return char === " " ? 0.34 : 0.56;
  }
  return 1;
}

function textUnits(value: string): number {
  return Array.from(value).reduce((sum, char) => sum + glyphUnits(char), 0);
}

export function splitOgTitle(
  rawTitle: string,
  maxUnits = 15.5,
  maxLines = 2,
): string[] {
  const title = rawTitle.trim() || "旅のしおり";
  const chars = Array.from(title);
  const lines: string[] = [];
  let cursor = 0;

  while (cursor < chars.length && lines.length < maxLines) {
    let line = "";
    let units = 0;
    let lastBreak = -1;

    while (cursor < chars.length) {
      const char = chars[cursor];
      const nextUnits = units + glyphUnits(char);
      if (line && nextUnits > maxUnits) break;

      line += char;
      units = nextUnits;
      cursor += 1;
      if (/\s/.test(char)) lastBreak = line.length - 1;
    }

    if (cursor < chars.length && lastBreak > 0) {
      const overflow = Array.from(line.slice(lastBreak + 1));
      cursor -= overflow.length;
      line = line.slice(0, lastBreak);
    }

    lines.push(line.trim());
    while (cursor < chars.length && /\s/.test(chars[cursor])) cursor += 1;
  }

  if (cursor < chars.length && lines.length) {
    let last = lines[lines.length - 1];
    while (last && textUnits(last + "…") > maxUnits) {
      last = Array.from(last).slice(0, -1).join("");
    }
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }

  return lines.filter(Boolean);
}
