import type { Theme } from '@tabitabi/types';
import ItineraryView from './ItineraryView.svelte';
import StepList from './StepList.svelte';

const fallTheme: Theme = {
  id: 'fall',
  name: 'オータム',
  version: '1.0.0',
  description: '秋色のやさしい配色で読みやすさ重視',
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
      primary: '#DFB89A',
      secondary: '#F7E3CC',
      background: '#FEF6EC',
      text: '#333333',
      accent: '#8b5e3c'
    }
  },
  components: {
    ItineraryView,
    StepList
  }
};

export default fallTheme;
