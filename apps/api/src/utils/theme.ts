const LEGACY_THEME_IDS: Record<string, string> = {
  'standard-spring': 'daycard',
  'standard-accordion': 'accordion',
  'standard-summer': 'list',
  'standard-autumn': 'week',
  'standard-winter': 'month',
};

/** Convert retired seasonal standard theme IDs to their view-based replacements. */
export function normalizeThemeId(themeId: string): string {
  return LEGACY_THEME_IDS[themeId] ?? themeId;
}
