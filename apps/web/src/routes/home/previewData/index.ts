export type { PreviewItinerary, PreviewStep, ThemeColors } from "./types";
export { minimalPreview } from "./minimal";
export { standardAutumnPreview } from "./standard-autumn";
export { aiGeneratedPreview } from "./ai-generated";

import { minimalPreview } from "./minimal";
import { standardAutumnPreview } from "./standard-autumn";
import { aiGeneratedPreview } from "./ai-generated";
import type { PreviewItinerary } from "./types";

export const previewItineraries: PreviewItinerary[] = [
  minimalPreview,
  standardAutumnPreview,
  aiGeneratedPreview,
];
