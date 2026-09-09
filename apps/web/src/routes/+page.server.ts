import type { PageServerLoad } from "./$types";

const PREVIEW_COUNT = 6;

// Pick the hero on the server so SSR and hydration always use the same preview.
// Cache the public landing page briefly at the edge: the selected hero still
// rotates frequently, while repeat visits avoid paying an SSR round-trip.
export const prerender = false;

export const load: PageServerLoad = ({ setHeaders }) => {
  setHeaders({
    "cache-control": "public, max-age=0, s-maxage=60, stale-while-revalidate=600",
  });

  return {
    previewIndex: Math.floor(Math.random() * PREVIEW_COUNT),
  };
};
