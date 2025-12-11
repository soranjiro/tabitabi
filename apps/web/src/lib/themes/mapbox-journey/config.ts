import type { ThemeConfig } from '@tabitabi/types';

export const mapboxJourneyTheme: ThemeConfig = {
  id: 'mapbox-journey',
  name: 'Mapbox Journey',
  version: '1.0.0',
  description: 'An immersive 3D map experience with Mapbox - featuring globe view, animated routes, and stunning visuals',
  author: 'Tabitabi Team',
  features: {
    steps: {
      enabled: true,
      required: true
    },
    map: {
      enabled: true,
      required: true
    }
  },
  ui: {
    layout: 'single',
    colorScheme: 'auto',
    customColors: {
      primary: '#7C3AED',
      secondary: '#EC4899',
      accent: '#06B6D4',
      background: '#0F172A',
      text: '#F8FAFC'
    }
  }
};
