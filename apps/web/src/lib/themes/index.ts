import { minimalTheme } from './minimal/config';
import { standardTheme } from './standard/config';
import type { ThemeConfig } from '@tabitabi/types';

const themes: Record<string, ThemeConfig> = {
  minimal: minimalTheme,
  standard: standardTheme,
};

export function getTheme(themeId: string): ThemeConfig {
  return themes[themeId] || themes.standard;
}

export function getAvailableThemes(): ThemeConfig[] {
  return Object.values(themes);
}

export { minimalTheme, standardTheme };
