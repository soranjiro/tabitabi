export type ViewMode = 'dayCard' | 'list' | 'month' | 'week';

const VIEW_MODE_KEY_PREFIX = 'tabitabi:itinerary:';
const VIEW_MODE_KEY_SUFFIX = ':viewMode';

export function getViewMode(itineraryId: string): ViewMode {
  if (typeof localStorage === 'undefined') return 'dayCard';
  const key = `${VIEW_MODE_KEY_PREFIX}${itineraryId}${VIEW_MODE_KEY_SUFFIX}`;
  const mode = localStorage.getItem(key);
  if (mode && isValidViewMode(mode)) {
    return mode;
  }
  return 'dayCard';
}

export function setViewMode(itineraryId: string, mode: ViewMode): void {
  if (typeof localStorage === 'undefined') return;
  const key = `${VIEW_MODE_KEY_PREFIX}${itineraryId}${VIEW_MODE_KEY_SUFFIX}`;
  localStorage.setItem(key, mode);
}

function isValidViewMode(mode: string): mode is ViewMode {
  return ['dayCard', 'list', 'month', 'week'].includes(mode);
}

export const VIEW_MODE_OPTIONS: Array<{ id: ViewMode; label: string; icon: string }> = [
  { id: 'dayCard', label: '日カード', icon: '📅' },
  { id: 'list', label: 'リスト', icon: '📋' },
  { id: 'month', label: '月カレンダー', icon: '🗓️' },
  { id: 'week', label: '週ビュー', icon: '📆' },
];
