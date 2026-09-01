export interface ThemeFeatureConfig {
  enabled: boolean;
  required?: boolean;
}

export interface ThemeUI {
  layout: 'single' | 'tabs' | 'sidebar' | 'accordion';
  colorScheme: 'light' | 'dark' | 'auto';
  customColors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
}

export interface ThemeComponents {
  ItineraryView?: any;
  StepList?: any;
  [key: string]: any;
}

export const DEFAULT_THEME_PRESET_ID = 'planning' as const;

/**
 * Canonical itinerary presentation presets.
 *
 * Seasonal names are intentionally excluded: colors belong to palette_id,
 * while this value describes how an itinerary is presented/used.
 */
export const THEME_PRESET_IDS = [
  'planning',
  'day-card',
  'accordion',
  'list',
  'week',
  'month',
  'map-only',
  'mapbox-journey',
  'ai-generated',
  'shopping',
  'pixel-quest',
  'sauna-rally',
] as const;

export type ThemePresetId = (typeof THEME_PRESET_IDS)[number];

/** Legacy values kept for existing rows/clients during the compatibility period. */
export const LEGACY_THEME_PRESET_ALIASES = {
  'planning-draft': 'planning',
  'standard-spring': 'day-card',
  'standard-accordion': 'accordion',
  'standard-summer': 'list',
  'standard-autumn': 'week',
  'standard-winter': 'month',
} as const satisfies Record<string, ThemePresetId>;

const CANONICAL_TO_LEGACY_THEME_ID: Partial<Record<ThemePresetId, string>> = {
  planning: 'planning-draft',
  'day-card': 'standard-spring',
  accordion: 'standard-accordion',
  list: 'standard-summer',
  week: 'standard-autumn',
  month: 'standard-winter',
};

/** Convert a legacy theme_id (or a canonical preset id) into the canonical preset id. */
export function normalizeThemePresetId(value?: string | null): string {
  if (!value) return DEFAULT_THEME_PRESET_ID;
  return LEGACY_THEME_PRESET_ALIASES[value as keyof typeof LEGACY_THEME_PRESET_ALIASES] ?? value;
}

/**
 * Convert a canonical preset id to the legacy theme_id expected by older clients.
 * Special/custom themes keep the same id.
 */
export function toLegacyThemeId(value?: string | null): string {
  const canonical = normalizeThemePresetId(value);
  return CANONICAL_TO_LEGACY_THEME_ID[canonical as ThemePresetId] ?? canonical;
}

export interface Theme {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  features: {
    steps?: ThemeFeatureConfig;
    timeline?: ThemeFeatureConfig;
    checklist?: ThemeFeatureConfig;
    budget?: ThemeFeatureConfig;
    memo?: ThemeFeatureConfig;
    map?: ThemeFeatureConfig;
    [key: string]: ThemeFeatureConfig | undefined;
  };
  ui: ThemeUI;
  components: ThemeComponents;
  styles?: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  features: {
    steps?: ThemeFeatureConfig;
    timeline?: ThemeFeatureConfig;
    checklist?: ThemeFeatureConfig;
    budget?: ThemeFeatureConfig;
    memo?: ThemeFeatureConfig;
    map?: ThemeFeatureConfig;
    [key: string]: ThemeFeatureConfig | undefined;
  };
  ui: ThemeUI;
  components?: ThemeComponents;
  styles?: string;
}
