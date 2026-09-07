import type { PageServerLoad } from "./$types";

const PREVIEW_COUNT = 4;

// Pick the hero on the server so SSR and hydration always use the same preview.
// This also ensures the preload hint only fetches the image that will actually render.
export const prerender = false;

export const load: PageServerLoad = () => ({
  previewIndex: Math.floor(Math.random() * PREVIEW_COUNT),
});
