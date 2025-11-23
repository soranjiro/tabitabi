import type { Theme } from '@tabitabi/types';
import ItineraryView from './ItineraryView.svelte';
import StepList from './StepList.svelte';

const fallTheme: Theme = {
  id: 'fall',
  name: 'オータム',
  version: '1.0.0',
  description: '秋',
  author: 'Tabitabi Team',
  features: {
    steps: { enabled: true, required: true },
    memo: { enabled: true },
    checklist: { enabled: false },
    budget: { enabled: false },
    map: { enabled: false }
  },
  ui: {
    layout: 'single',
    colorScheme: 'light',
    customColors: {
      primary: '#a93529',
      secondary: '#e6b422',
      background: '#fcf9f2',
      text: '#4a3b32',
      accent: '#d4762c'
    }
  },
  components: {
    ItineraryView,
    StepList
  }
};

export default fallTheme;
