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
  switch (themeId) {
    case "map-only":
      return (await import("./map-only")).default;
    case "mapbox-journey":
      return (await import("./mapbox-journey")).default;
    case "standard-spring":
      return (await import("./standard/presets/day-card")).default;
    case "standard-accordion":
      return (await import("./standard/presets/accordion")).default;
    case "standard-summer":
      return (await import("./standard/presets/list")).default;
    case "standard-autumn":
      return (await import("./standard/presets/week")).default;
    case "standard-winter":
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
      return (await import("./standard/presets/accordion")).default;
  }
}

export function getEnabledFeatures(theme: Theme): string[] {
  return Object.entries(theme.features)
    .filter(([_, config]) => config?.enabled)
    .map(([name]) => name);
}
