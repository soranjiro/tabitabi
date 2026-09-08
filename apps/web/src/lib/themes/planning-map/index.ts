import type { Theme } from '@tabitabi/types';
import { planningMapTheme } from './config';
import ItineraryView from './ItineraryView.svelte';
export default { ...planningMapTheme, components: { ItineraryView } } satisfies Theme;
