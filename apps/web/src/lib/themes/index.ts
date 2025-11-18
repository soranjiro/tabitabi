import type { Theme } from '@tabitabi/types';
import minimalTheme from './minimal';
import standardTheme from './standard';

const themes: Record<string, Theme> = {
  minimal: minimalTheme,
  standard: standardTheme
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

export function getAvailableThemes(): Array<{ id: string; name: string; description: string }> {
  return Object.values(themes).map(theme => ({
    id: theme.id,
    name: theme.name,
    description: theme.description
  }));
}

export const availableThemes = ['minimal', 'standard'] as const;
export type AvailableTheme = typeof availableThemes[number];
