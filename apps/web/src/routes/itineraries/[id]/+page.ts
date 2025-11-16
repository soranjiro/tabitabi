import type { PageLoad } from './$types';
import { itineraryApi } from '$lib/api/itinerary';
import { timelineApi } from '$lib/api/timeline';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params }) => {
  try {
    const itinerary = await itineraryApi.get(params.id);
    const timeline = await timelineApi.list(params.id);

    return {
      itinerary,
      timeline
    };
  } catch (e) {
    throw error(404, 'Itinerary not found');
  }
};
