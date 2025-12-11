import type { ThemeConfig } from '@tabitabi/types';

export const mapOnlyTheme: ThemeConfig = {
  id: 'map-only',
  name: 'Map Only',
  version: '1.0.0',
  description: 'A minimal theme showing only a map and a menu button',
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
      primary: '#000000',
      background: '#FFFFFF',
      text: '#000000'
    }
  }
};
