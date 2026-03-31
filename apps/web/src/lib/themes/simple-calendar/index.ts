import type { Theme } from '@tabitabi/types';
import ItineraryView from './ItineraryView.svelte';
import StepList from './StepList.svelte';

const simpleCalendarTheme: Theme = {
  id: 'simple-calendar',
  name: 'シンプルカレンダー',
  version: '1.0.0',
  description: 'Google Calendarのような使いやすい縦スクロール型カレンダーテーマ',
  author: 'Tabitabi Team',
  features: {
    steps: {
      enabled: true,
      required: true
    },
    memo: {
      enabled: true
    }
  },
  ui: {
    layout: 'single',
    colorScheme: 'light',
    customColors: {
      primary: '#2563eb',
      secondary: '#60a5fa',
      accent: '#3b82f6',
      background: '#ffffff',
      text: '#1f2937'
    }
  },
  components: {
    ItineraryView,
    StepList
  }
};

export default simpleCalendarTheme;
