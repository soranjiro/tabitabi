export type { PreviewItinerary, PreviewStep, ThemeColors } from "./types";
import { minimalPreview } from "./minimal";
import { standardAutumnPreview } from "./standard-autumn";
import { aiGeneratedPreview } from "./ai-generated";
import type { PreviewItinerary } from "./types";

export const previewItineraries: PreviewItinerary[] = [
  minimalPreview,
  standardAutumnPreview,
  aiGeneratedPreview,
];
