import type { Theme } from '@tabitabi/types';

export const saunaRallyTheme: Omit<Theme, 'components'> = {
  id: 'sauna-rally',
  name: 'サウナスタンプラリー',
  version: '1.0.0',
  description: 'サウナ旅を楽しくスタンプラリー形式で記録',
  author: 'Tabitabi Team',
  features: {
    steps: {
      enabled: true,
      required: true
    },
    memo: {
      enabled: true,
    }
  },
  ui: {
    layout: 'single',
    colorScheme: 'light',
    customColors: {
      primary: '#FF6B35',
      secondary: '#004E89',
      accent: '#F7B801',
      background: '#FFF8F0',
      text: '#2C3E50'
    }
  }
};
