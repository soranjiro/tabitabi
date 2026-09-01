import { error } from "@sveltejs/kit";
import { itineraryApi } from "$lib/api/itinerary";
import { stepApi } from "$lib/api/step";
import { loadTheme } from "$lib/themes";
import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = async ({ params }) => {
  try {
    const itinerary = await itineraryApi.get(params.id);
    const theme = await loadTheme(itinerary.theme_preset_id ?? itinerary.theme_id);
    const steps = await stepApi.list(params.id);
    return { itinerary, theme, steps };
  } catch {
    throw error(404, "しおりが見つかりません");
  }
};
