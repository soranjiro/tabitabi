import type { ThemeConfig } from '@tabitabi/types';

export const standardTheme: ThemeConfig = {
  id: 'standard',
  name: 'スタンダード',
  version: '1.0.0',
  description: '充実した機能を持つスタンダードテーマ',
  author: 'Tabitabi',
  features: {
    timeline: {
      enabled: true,
      required: true,
    },
    checklist: {
      enabled: true,
    },
    budget: {
      enabled: true,
    },
    memo: {
      enabled: true,
    },
    map: {
      enabled: true,
    },
  },
  ui: {
    layout: 'sidebar',
    colorScheme: 'auto',
    customColors: {
      primary: '#0ea5e9',
      secondary: '#64748b',
      accent: '#f59e0b',
    },
  },
};
