export type { PreviewItinerary, PreviewStep, ThemeColors } from "./types";
import { minimalPreview } from "./minimal";
import { standardAutumnPreview } from "./standard-autumn";
import { aiGeneratedPreview } from "./ai-generated";
import { shoppingPreview } from "./shopping";
import { pixelQuestPreview } from "./pixel-quest";
import { comingSoonPreview } from "./coming-soon";
import type { PreviewItinerary } from "./types";

export const previewItineraries: PreviewItinerary[] = [
  minimalPreview,
  standardAutumnPreview,
  aiGeneratedPreview,
  shoppingPreview,
  pixelQuestPreview,
  comingSoonPreview,
];
