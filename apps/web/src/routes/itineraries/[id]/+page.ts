import { error } from "@sveltejs/kit";
import { itineraryApi } from "$lib/api/itinerary";
import { stepApi } from "$lib/api/step";
import { loadTheme } from "$lib/themes";
import { findPublicItinerary, kyotoItinerary } from "$lib/explore/data";
import type { PublicItineraryDetail } from "$lib/explore/data";
import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = async ({ params }) => {
  const publicItinerary = findPublicItinerary(params.id);

  if (publicItinerary) {
    const detail: PublicItineraryDetail = "days" in publicItinerary
      ? publicItinerary
      : {
          ...publicItinerary,
          dateRange: "2026年10月10日（土）— 10月11日（日）",
          updatedAt: "2026年8月6日",
          intro: publicItinerary.description,
          memo: "移動には少し余裕を持たせています。気になった場所があれば、コピーして自由に入れ替えてください。",
          days: kyotoItinerary.days.slice(0, 2),
        };

    return { publicPrototype: true as const, publicItinerary: detail };
  }

  try {
    const itinerary = await itineraryApi.get(params.id);
    const theme = await loadTheme(itinerary.theme_id);
    const steps = await stepApi.list(params.id);
    return { publicPrototype: false as const, itinerary, theme, steps };
  } catch {
    throw error(404, "しおりが見つかりません");
  }
};
