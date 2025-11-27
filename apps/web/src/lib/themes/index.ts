import type { Theme } from '@tabitabi/types';

// 動的 import に切り替え（未選択テーマをバンドルしない）
export async function loadTheme(themeId: string): Promise<Theme> {
  switch (themeId) {
    case 'standard-autumn':
      return (await import('./standard-autumn')).default;
    case 'ai-generated':
      return (await import('./ai-generated')).default;
    case 'shopping':
      return (await import('./shopping')).default;
    case 'pixel-quest':
      return (await import('./pixel-quest')).default;
    case 'minimal':
    default:
      return (await import('./minimal')).default;
  }
}

export function getEnabledFeatures(theme: Theme): string[] {
  return Object.entries(theme.features)
    .filter(([_, config]) => config?.enabled)
    .map(([name]) => name);
}

// メタ情報だけを静的に保持（テーマ本体は読み込まない）
const THEME_CATALOG: Array<{ id: AvailableTheme; name: string; description: string }> = [
  { id: 'minimal', name: 'ミニマル', description: '軽量で最低限' },
  { id: 'standard-autumn', name: '標準', description: 'モチーフ秋' },
  { id: 'ai-generated', name: 'AI Generated', description: 'purple' },
  { id: 'shopping', name: '買い物リスト', description: '買い物管理向け' },
  { id: 'pixel-quest', name: 'ピクセルクエスト', description: 'RPG風マップ表示' },
];

export function getAvailableThemes(): Array<{ id: string; name: string; description: string }> {
  return THEME_CATALOG;
}

export const availableThemes = ['minimal', 'ai-generated', 'standard-autumn', 'shopping', 'pixel-quest'] as const;
export type AvailableTheme = typeof availableThemes[number];
