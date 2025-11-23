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
      primary: '#bf360c',
      secondary: '#fff3e0',
      background: '#fdfbf7',
      text: '#3e2723',
      accent: '#e65100'
    }
  },
  components: {
    ItineraryView,
    StepList
  }
};

export default fallTheme;
