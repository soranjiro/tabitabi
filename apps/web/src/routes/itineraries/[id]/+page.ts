import { error, redirect } from "@sveltejs/kit";
import { itineraryApi } from "$lib/api/itinerary";
import { stepApi } from "$lib/api/step";
import { loadTheme } from "$lib/themes";
import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = async ({ params }) => {
  let itinerary;
  try {
    itinerary = await itineraryApi.get(params.id);
  } catch {
    throw error(404, "しおりが見つかりません");
  }

  // Published/shared snapshots belong to the public read-only URL.
  // Keep old /itineraries/:id links working while canonicalizing the browser URL.
  if (itinerary.source_itinerary_id) {
    throw redirect(308, `/s/${params.id}`);
  }

  try {
    const theme = await loadTheme(itinerary.theme_id);
    const steps = await stepApi.list(params.id);
    return { itinerary, theme, steps };
  } catch {
    throw error(404, "しおりが見つかりません");
  }
};
