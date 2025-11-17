import type { ThemeConfig } from '@tabitabi/types';

export const minimalTheme: ThemeConfig = {
  id: 'minimal',
  name: 'ミニマル',
  version: '1.0.0',
  description: 'シンプルで必要最小限の機能を持つテーマ',
  author: 'Tabitabi',
  features: {
    timeline: {
      enabled: true,
      required: true,
    },
    checklist: {
      enabled: false,
    },
    budget: {
      enabled: false,
    },
    memo: {
      enabled: false,
    },
    map: {
      enabled: false,
    },
  },
  ui: {
    layout: 'tabs',
    colorScheme: 'light',
    customColors: {
      primary: '#3b82f6',
      secondary: '#64748b',
      accent: '#8b5cf6',
    },
  },
};
