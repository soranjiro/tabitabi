import type { ThemeConfig } from '@tabitabi/types';

export const mapOnlyTheme: ThemeConfig = {
  id: 'map-only',
  name: '旅先マップ',
  version: '2.0.0',
  description: '地図に候補をピンし、行き先を決めて予定へ追加するモバイル向けテーマ',
  author: 'Tabitabi Team',
  features: {
    steps: {
      enabled: true,
      required: true
    }
  },
  ui: {
    layout: 'single',
    colorScheme: 'light',
    customColors: {
      primary: '#2563eb',
      background: '#f8fafc',
      text: '#0f172a'
    }
  }
};
