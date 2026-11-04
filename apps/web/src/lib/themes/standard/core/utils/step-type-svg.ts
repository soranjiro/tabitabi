import type { StepType } from "@tabitabi/types";
import { STEP_TYPE } from "@tabitabi/types";

/**
 * Monochrome, 24px outline icons shared by the planning picker, list, details,
 * and Leaflet markers. Every SVG comes from this static map; never interpolate
 * itinerary/user text into SVG markup.
 */
const SVG_CONTENT: Record<StepType, string> = {
  [STEP_TYPE.NORMAL_GENERAL]: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 14h3M8 17h6"/>',
  [STEP_TYPE.NORMAL_FOOD]: '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M19 3c-3 3-4 7-4 11h4v7"/>',
  [STEP_TYPE.NORMAL_MEAL]: '<path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M19 3c-3 3-4 7-4 11h4v7"/>',
  [STEP_TYPE.NORMAL_HOTEL]: '<path d="M3 20V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12M3 16h18M6 16v-5h5a2 2 0 0 1 2 2v3M16 12h2M3 20v2M21 20v2"/>',
  [STEP_TYPE.NORMAL_SIGHTSEEING]: '<path d="M3 10h18L12 3 3 10ZM5 10v9M9 10v9M15 10v9M19 10v9M3 21h18"/>',
  [STEP_TYPE.NORMAL_SHOPPING]: '<path d="M5 8h14l-1 13H6L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  [STEP_TYPE.TRANSPORT_GENERAL]: '<circle cx="13" cy="4" r="2"/><path d="M10 8l-3 5 4 2-2 6M10 8l4 2 2 4 3 1M11 15l4 2 2 4"/>',
  [STEP_TYPE.TRANSPORT_TRAIN]: '<rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 12h14M8 7h8M8 19l-2 3M16 19l2 3"/>',
  [STEP_TYPE.TRANSPORT_CAR]: '<path d="m5 10 2-5h10l2 5M4 10h16v8H4zM7 18v2M17 18v2"/><path d="M7 14h.01M17 14h.01"/>',
  [STEP_TYPE.TRANSPORT_PLANE]: '<path d="M2 16l8-2V4a2 2 0 0 1 4 0v10l8 2v2l-8-1v3l2 1v1H8v-1l2-1v-3l-8 1z"/>',
  [STEP_TYPE.TRANSPORT_BUS]: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M4 13h16M8 7h8M8 17h.01M16 17h.01M7 21v2M17 21v2"/>',
  [STEP_TYPE.TRANSPORT_SHIP]: '<path d="M3 16h18l-3 5H6l-3-5ZM12 3v13M5 12h14M7 12V7h10v5M2 23c2-1 3-1 5 0s3 1 5 0 3-1 5 0 3 1 5 0"/>',
};

const SVG_PREFIX = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">';
const SVG_SUFFIX = '</svg>';

export function getStepTypeSvg(type?: StepType): string {
  const key = type && Object.prototype.hasOwnProperty.call(SVG_CONTENT, type)
    ? type
    : STEP_TYPE.NORMAL_GENERAL;
  return SVG_PREFIX + SVG_CONTENT[key] + SVG_SUFFIX;
}
