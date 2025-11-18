import type { Theme } from '@tabitabi/types';

// 動的 import に切り替え（未選択テーマをバンドルしない）
export async function loadTheme(themeId: string): Promise<Theme> {
  switch (themeId) {
    case 'standard':
      return (await import('./standard')).default;
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
  { id: 'standard', name: 'スタンダード', description: 'デフォルトテーマ' }
];

export function getAvailableThemes(): Array<{ id: string; name: string; description: string }> {
  return THEME_CATALOG;
}

export const availableThemes = ['minimal', 'standard'] as const;
export type AvailableTheme = typeof availableThemes[number];
