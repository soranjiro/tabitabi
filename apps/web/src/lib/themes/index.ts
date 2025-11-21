import type { Theme } from '@tabitabi/types';

// 動的 import に切り替え（未選択テーマをバンドルしない）
export async function loadTheme(themeId: string): Promise<Theme> {
  switch (themeId) {
    case 'standard-autumn':
      return (await import('./standard-autumn')).default;
    case 'ai-generated':
      return (await import('./ai-generated')).default;
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
  { id: 'minimal', name: 'ミニマル', description: '必要最小限のシンプルなテーマ' },
  { id: 'ai-generated', name: 'AI Generated', description: 'AI生成デザイン' },
  { id: 'standard-autumn', name: 'スタンダードオータム', description: '秋色のやさしい配色で読みやすさ重視' }
];

export function getAvailableThemes(): Array<{ id: string; name: string; description: string }> {
  return THEME_CATALOG;
}

export const availableThemes = ['minimal', 'ai-generated', 'standard-autumn'] as const;
export type AvailableTheme = typeof availableThemes[number];
