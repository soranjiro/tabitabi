import type { ThemeConfig } from '@tabitabi/types';

export const aiGeneratedTheme: ThemeConfig = {
  id: 'ai-generated',
  name: 'AI Generated',
  version: '2.0.0',
  description: 'Modern and feature-rich theme with timeline view, secret mode, Walica integration, and Markdown support',
  author: 'Tabitabi AI',
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
    secretMode: {
      enabled: true,
    },
    walica: {
      enabled: true,
    },
    markdown: {
      enabled: true,
    },
  },
  ui: {
    layout: 'single',
    colorScheme: 'auto',
    customColors: {
      primary: '#6366f1',
      secondary: '#ec4899',
      accent: '#14b8a6',
    },
  },
};
