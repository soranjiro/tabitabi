export type { PreviewItinerary, PreviewStep, ThemeColors } from "./types";
import { mapOnlyPreview } from "./map-only";
import { mapboxJourneyPreview } from "./mapbox-journey";
import { standardAutumnPreview } from "./standard-autumn";
import { aiGeneratedPreview } from "./ai-generated";
import { shoppingPreview } from "./shopping";
import { pixelQuestPreview } from "./pixel-quest";
import { comingSoonPreview } from "./coming-soon";
import type { PreviewItinerary } from "./types";

export const previewItineraries: PreviewItinerary[] = [
  mapOnlyPreview,
  mapboxJourneyPreview,
  standardAutumnPreview,
  shoppingPreview,
  pixelQuestPreview,
  aiGeneratedPreview,
  comingSoonPreview,
];
