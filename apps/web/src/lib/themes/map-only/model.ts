import type { Step } from "@tabitabi/types";
import { parseMemoData, stringifyMemoData } from "$lib/memo";

export type MapCandidateCategory =
  | "sightseeing"
  | "food"
  | "hotel"
  | "shopping"
  | "other";

export interface MapCandidate {
  id: string;
  title: string;
  lat: number;
  lng: number;
  category: MapCandidateCategory;
  notes: string;
  createdAt: string;
}

export interface MapPoint {
  id: string;
  title: string;
  lat: number;
  lng: number;
  label?: string;
}

const CATEGORY_VALUES = new Set<MapCandidateCategory>([
  "sightseeing",
  "food",
  "hotel",
  "shopping",
  "other",
]);

function isCoordinate(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function normalizeCandidate(value: unknown): MapCandidate | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || typeof item.title !== "string") return null;
  if (!item.title.trim()) return null;
  if (!isCoordinate(item.lat, -90, 90) || !isCoordinate(item.lng, -180, 180)) return null;

  const category = CATEGORY_VALUES.has(item.category as MapCandidateCategory)
    ? (item.category as MapCandidateCategory)
    : "other";

  return {
    id: item.id,
    title: item.title.trim(),
    lat: item.lat,
    lng: item.lng,
    category,
    notes: typeof item.notes === "string" ? item.notes : "",
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date(0).toISOString(),
  };
}

export function readMapCandidates(memo: string | null | undefined): MapCandidate[] {
  const raw = parseMemoData(memo).mapCandidates;
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeCandidate).filter((item): item is MapCandidate => item !== null);
}

export function writeMapCandidates(
  memo: string | null | undefined,
  candidates: MapCandidate[],
): string {
  const data = parseMemoData(memo);
  data.mapCandidates = candidates;
  return stringifyMemoData(data);
}

export function parseCoordinateText(value: string | null | undefined): { lat: number; lng: number } | null {
  if (!value) return null;
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!isCoordinate(lat, -90, 90) || !isCoordinate(lng, -180, 180)) return null;
  return { lat, lng };
}

export function buildExternalMapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
}

export function extractCoordinatesFromStep(step: Step): { lat: number; lng: number } | null {
  const direct = parseCoordinateText(step.location);
  if (direct) return direct;

  if (!step.link) return null;
  try {
    const url = new URL(step.link);
    const query = url.searchParams.get("query");
    return parseCoordinateText(query);
  } catch {
    return null;
  }
}
