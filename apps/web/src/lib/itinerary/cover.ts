import type { ItineraryResponse, Step } from "@tabitabi/types";

export const ITINERARY_THEME_COVER_IMAGES: Readonly<Record<string, string>> = {
  daycard: "/hero/background-spring.avif",
  list: "/hero/background-summer.avif",
  week: "/hero/background-autumn.avif",
  month: "/hero/background-winter.avif",
  "map-only": "/itinerary-backgrounds/coastal-drive.avif",
  "mapbox-journey": "/itinerary-backgrounds/sky.avif",
  shopping: "/itinerary-backgrounds/food.webp",
};

export const DEFAULT_ITINERARY_COVER_IMAGE = "/itinerary-backgrounds/japanese.avif";

export function resolveItineraryCoverImage(
  backgroundImage: string | null | undefined,
  themeId: string,
): string {
  return backgroundImage || ITINERARY_THEME_COVER_IMAGES[themeId] || DEFAULT_ITINERARY_COVER_IMAGE;
}

export interface ItineraryDateRange {
  startAt: number;
  endAt: number;
}

export function getItineraryDateRange(
  steps: ReadonlyArray<Pick<Step, "start_at" | "end_at">>,
): ItineraryDateRange | null {
  let startAt = Number.POSITIVE_INFINITY;
  let endAt = Number.NEGATIVE_INFINITY;

  for (const step of steps) {
    if (step.start_at !== null && Number.isFinite(step.start_at)) {
      startAt = Math.min(startAt, step.start_at);
    }
    if (step.end_at !== null && Number.isFinite(step.end_at)) {
      endAt = Math.max(endAt, step.end_at);
    }
  }

  if (!Number.isFinite(startAt) || !Number.isFinite(endAt)) return null;
  return { startAt, endAt };
}

const DATE_FORMATTER = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatDate(timestamp: number): string {
  const parts = DATE_FORMATTER.formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}.${value("month")}.${value("day")}`;
}

export function formatItineraryDateRange(range: ItineraryDateRange | null): string {
  if (!range) return "";
  const start = formatDate(range.startAt);
  const end = formatDate(range.endAt);
  return start === end ? start : `${start} — ${end}`;
}

function fnv1a(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function getItineraryOgVersion(
  itinerary: Pick<ItineraryResponse, "title" | "theme_id" | "background_image" | "updated_at">,
  steps: ReadonlyArray<Pick<Step, "start_at" | "end_at" | "updated_at">>,
): string {
  const content = [
    itinerary.title,
    itinerary.theme_id,
    itinerary.background_image ?? "",
    itinerary.updated_at,
    ...steps.flatMap((step) => [
      String(step.start_at ?? ""),
      String(step.end_at ?? ""),
      step.updated_at,
    ]),
  ].join("\u001f");

  return fnv1a(content).toString(36);
}
