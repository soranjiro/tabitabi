import type { ItineraryViewMode } from '@tabitabi/types';

export type ViewMode = ItineraryViewMode | 'printPreview';
export const DEFAULT_VIEW_MODE: ItineraryViewMode = 'dayCard';

export function isValidViewMode(mode: string): mode is ViewMode {
  return ['dayCard', 'list', 'month', 'week', 'printPreview'].includes(mode);
}

export const VIEW_MODE_OPTIONS: Array<{ id: ViewMode; label: string; icon: string }> = [
  { id: 'dayCard', label: '日カード', icon: '📅' },
  { id: 'list', label: 'リスト', icon: '📋' },
  { id: 'month', label: '月カレンダー', icon: '🗓️' },
  { id: 'week', label: '週ビュー', icon: '📆' },
];
