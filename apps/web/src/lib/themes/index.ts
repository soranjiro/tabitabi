import type { Theme } from '@tabitabi/types';

export const defaultThemeId = 'standard-autumn' as const;

// 動的 import に切り替え（未選択テーマをバンドルしない）
export async function loadTheme(themeId: string): Promise<Theme> {
  switch (themeId) {
    case 'map-only':
      return (await import('./map-only')).default;
    case 'mapbox-journey':
      return (await import('./mapbox-journey')).default;
    case 'standard-autumn':
      return (await import('./standard-autumn')).default;
    case 'ai-generated':
      return (await import('./ai-generated')).default;
    case 'shopping':
      return (await import('./shopping')).default;
    case 'pixel-quest':
      return (await import('./pixel-quest')).default;
    default:
      return (await import('./standard-autumn')).default;
  }
}

export function getEnabledFeatures(theme: Theme): string[] {
  return Object.entries(theme.features)
    .filter(([_, config]) => config?.enabled)
    .map(([name]) => name);
}

// メタ情報だけを静的に保持（テーマ本体は読み込まない）
const THEME_CATALOG: Array<{ id: AvailableTheme; name: string; description: string; phrase: string }> = [
  { id: 'standard-autumn', name: '標準', description: 'モチーフ秋', phrase: '旅行のしおり' },
  { id: 'shopping', name: '買い物リスト', description: '買い物管理向け', phrase: '買い物プラン' },
  { id: 'pixel-quest', name: 'ピクセルクエスト', description: 'RPG風マップ表示', phrase: 'RPGデザイン' },
  { id: 'map-only', name: 'Map Only', description: '地図のみを表示', phrase: '地図で計画' },
  { id: 'mapbox-journey', name: 'Mapbox Journey', description: '3D地図・グローブ表示', phrase: '世界旅行' },
  { id: 'ai-generated', name: 'AI Generated', description: 'purple', phrase: 'ユニーク計画' },
];

export function getAvailableThemes(): Array<{ id: string; name: string; description: string }> {
  return THEME_CATALOG;
}

export function getThemePhrases(): string[] {
  return THEME_CATALOG.map(theme => theme.phrase);
}

export const availableThemes = ['map-only', 'mapbox-journey', 'standard-autumn', 'ai-generated', 'shopping', 'pixel-quest'] as const;
export type AvailableTheme = typeof availableThemes[number];
