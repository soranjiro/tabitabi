import type { PageLoad } from './$types';
import { itineraryApi } from '$lib/api/itinerary';
import { stepApi } from '$lib/api/step';
import { userApi } from '$lib/api/user';
import { userAuth } from '$lib/user-auth';
import { loadTheme } from '$lib/themes';
import { error } from '@sveltejs/kit';

export const prerender = false;

export const load: PageLoad = async ({ params }) => {
  try {
    const itinerary = await itineraryApi.get(params.id);
    const theme = await loadTheme(itinerary.theme_id);
    const steps = await stepApi.list(params.id);

    let isOwner = false;
    if (userAuth.isLoggedIn()) {
      try {
        await userApi.checkOwnership(params.id);
        isOwner = true;
      } catch (e) {
        // 404 = bookmark not found (not owner)
        // 401 = token expired → isLoggedIn() で事前にチェック済みのため通常発生しない
        isOwner = false;
      }
    }

    return {
      itinerary,
      theme,
      steps,
      isOwner,
    };
  } catch (e) {
    throw error(404, 'しおりが見つかりません');
  }
};
