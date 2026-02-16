import type { Theme } from "@tabitabi/types";

export {
  defaultThemeId,
  availableThemes,
  getAvailableThemes,
  getThemePhrases,
} from "./catalog";
export type { AvailableTheme } from "./catalog";

export async function loadTheme(themeId: string): Promise<Theme> {
  switch (themeId) {
    case "map-only":
      return (await import("./map-only")).default;
    case "mapbox-journey":
      return (await import("./mapbox-journey")).default;
    case "standard-autumn":
      return (await import("./standard-autumn")).default;
    case "ai-generated":
      return (await import("./ai-generated")).default;
    case "shopping":
      return (await import("./shopping")).default;
    case "pixel-quest":
      return (await import("./pixel-quest")).default;
    case "sauna-rally":
      return (await import("./sauna-rally")).default;
    default:
      return (await import("./standard-autumn")).default;
  }
}

export function getEnabledFeatures(theme: Theme): string[] {
  return Object.entries(theme.features)
    .filter(([_, config]) => config?.enabled)
    .map(([name]) => name);
}
