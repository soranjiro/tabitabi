import type { Theme } from '@tabitabi/types';
import minimalTheme from './minimal';

const themes: Record<string, Theme> = {
  minimal: minimalTheme
};

export async function loadTheme(themeId: string): Promise<Theme> {
  const theme = themes[themeId] || themes.minimal;
  return theme;
}

export function getEnabledFeatures(theme: Theme): string[] {
  return Object.entries(theme.features)
    .filter(([_, config]) => config?.enabled)
    .map(([name]) => name);
}

export const availableThemes = ['minimal', 'standard'] as const;
export type AvailableTheme = typeof availableThemes[number];
