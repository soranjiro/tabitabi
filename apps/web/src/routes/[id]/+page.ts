import type { PageLoad } from './$types';
import { itineraryApi } from '$lib/api/itinerary';
import { stepApi } from '$lib/api/step';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
  try {
    const [itinerary, steps] = await Promise.all([
      itineraryApi.get(params.id),
      stepApi.list(params.id)
    ]);

    return {
      itinerary,
      steps
    };
  } catch (e) {
    throw error(404, 'しおりが見つかりません');
  }
};
