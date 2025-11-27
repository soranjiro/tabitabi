import type { Theme } from '@tabitabi/types';

export const shoppingTheme: Omit<Theme, 'components'> = {
  id: 'shopping',
  name: '買い物リスト',
  version: '1.0.0',
  description: '買い物・お使い管理に特化したテーマ',
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
      primary: '#10b981',
      secondary: '#f59e0b',
      accent: '#06b6d4',
      background: '#f0fdf4',
      text: '#1f2937'
    }
  }
};
