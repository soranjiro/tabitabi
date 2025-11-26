import type { Theme } from '@tabitabi/types';
import ItineraryView from './ItineraryView.svelte';
import StepList from './StepList.svelte';

const aiGeneratedTheme: Theme = {
  id: 'ai-generated',
  name: 'AI Generated',
  version: '2.0.0',
  description: 'Modern and feature-rich theme with timeline view',
  author: 'Tabitabi AI',
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
    },
    secretMode: {
      enabled: true
    },
    walica: {
      enabled: true
    },
    markdown: {
      enabled: true
    }
  },
  ui: {
    layout: 'single',
    colorScheme: 'light',
    customColors: {
      primary: '#6366f1',
      secondary: '#ec4899',
      accent: '#14b8a6'
    }
  },
  components: {
    ItineraryView,
    StepList
  }
};

export default aiGeneratedTheme;
