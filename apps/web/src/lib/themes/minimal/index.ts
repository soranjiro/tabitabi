import type { Theme } from '@tabitabi/types';
import ItineraryView from './ItineraryView.svelte';
import StepList from './StepList.svelte';

const minimalTheme: Theme = {
  id: 'minimal',
  name: 'ミニマル',
  version: '1.0.0',
  description: '必要最小限のシンプルなテーマ',
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
      text: '#333333'
    }
  },
  components: {
    ItineraryView,
    StepList
  }
};

export default minimalTheme;
