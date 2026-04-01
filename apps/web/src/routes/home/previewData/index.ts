export type { PreviewItinerary, PreviewStep, ThemeColors } from "./types";
import { mapOnlyPreview } from "./map-only";
import { mapboxJourneyPreview } from "./mapbox-journey";
import { standardSpringPreview } from "./standard-spring";
import { standardSummerPreview } from "./standard-summer";
import { standardAutumnPreview } from "./standard-autumn";
import { standardWinterPreview } from "./standard-winter";
import { aiGeneratedPreview } from "./ai-generated";
import { shoppingPreview } from "./shopping";
import { pixelQuestPreview } from "./pixel-quest";
import { saunaRallyPreview } from "./sauna-rally";
import type { PreviewItinerary } from "./types";

export const previewItineraries: PreviewItinerary[] = [
  standardSpringPreview,
  standardSummerPreview,
  standardAutumnPreview,
  standardWinterPreview,
  shoppingPreview,
  pixelQuestPreview,
  mapOnlyPreview,
  mapboxJourneyPreview,
  aiGeneratedPreview,
  saunaRallyPreview,
];
