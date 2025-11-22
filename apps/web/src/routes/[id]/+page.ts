import type { PageLoad } from './$types';
import { itineraryApi } from '$lib/api/itinerary';
import { stepApi } from '$lib/api/step';
import { loadTheme } from '$lib/themes';
import { error } from '@sveltejs/kit';

export const prerender = false;

export const load: PageLoad = async ({ params }) => {
  try {
    const itinerary = await itineraryApi.get(params.id);
    const theme = await loadTheme(itinerary.theme_id);
    const steps = await stepApi.list(params.id);

    return {
      itinerary,
      theme,
      steps
    };
  } catch (e) {
    throw error(404, 'しおりが見つかりません');
  }
};
