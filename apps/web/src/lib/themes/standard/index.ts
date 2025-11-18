import type { Theme } from '@tabitabi/types';
import ItineraryView from './ItineraryView.svelte';
import StepList from './StepList.svelte';

const standardTheme: Theme = {
  id: 'standard',
  name: 'スタンダード',
  version: '1.0.0',
  description: 'デフォルトテーマ',
  author: 'Tabitabi',
  features: {
    steps: {
      enabled: true,
      required: true
    },
    checklist: {
      enabled: true
    },
    budget: {
      enabled: true
    },
    memo: {
      enabled: true
    },
    map: {
      enabled: true
    }
  },
  ui: {
    layout: 'single',
    colorScheme: 'light',
    customColors: {
      primary: '#a78bfa',
      secondary: '#f9a8d4',
      accent: '#fbbf24'
    }
  },
  components: {
    ItineraryView,
    StepList
  }
};

export default standardTheme;
