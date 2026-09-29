import type { PageServerLoad } from "./$types";

const PREVIEW_COUNT = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

// Rotate the landing sample once per UTC day instead of on every request.
// This keeps the first impression stable while still showing the range of
// available itinerary styles over time.
export const prerender = false;

export const load: PageServerLoad = ({ setHeaders }) => {
  setHeaders({
    "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
  });

  const dayIndex = Math.floor(Date.now() / DAY_MS);

  return {
    previewIndex: dayIndex % PREVIEW_COUNT,
  };
};
