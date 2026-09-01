import { normalizeThemePresetId } from "@tabitabi/types";
import type { Theme } from "@tabitabi/types";

export {
  defaultThemeId,
  availableThemes,
  defaultPaletteId,
  getAvailableThemes,
  getAvailablePalettes,
  getPalette,
  getThemePreset,
  getThemePhrases,
} from "./catalog";
export type { AvailableTheme, PaletteId, ThemePresetOption } from "./catalog";

export async function loadTheme(themeId: string): Promise<Theme> {
  switch (normalizeThemePresetId(themeId)) {
    case "planning":
      return (await import("./planning-draft")).default;
    case "map-only":
      return (await import("./map-only")).default;
    case "mapbox-journey":
      return (await import("./mapbox-journey")).default;
    case "day-card":
      return (await import("./standard/presets/day-card")).default;
    case "accordion":
      return (await import("./standard/presets/accordion")).default;
    case "list":
      return (await import("./standard/presets/list")).default;
    case "week":
      return (await import("./standard/presets/week")).default;
    case "month":
      return (await import("./standard/presets/month")).default;
    case "ai-generated":
      return (await import("./ai-generated")).default;
    case "shopping":
      return (await import("./shopping")).default;
    case "pixel-quest":
      return (await import("./pixel-quest")).default;
    case "sauna-rally":
      return (await import("./sauna-rally")).default;
    default:
      return (await import("./planning-draft")).default;
  }
}

export function getEnabledFeatures(theme: Theme): string[] {
  return Object.entries(theme.features)
    .filter(([_, config]) => config?.enabled)
    .map(([name]) => name);
}
