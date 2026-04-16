import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { validateOrigin } from '$lib/server/validate-origin';

export const GET: RequestHandler = async ({ request }) => {
  validateOrigin(request);

  const MAPBOX_ACCESS_TOKEN = env.MAPBOX_ACCESS_TOKEN;
  if (!MAPBOX_ACCESS_TOKEN) {
    throw error(500, 'Mapbox token not configured');
  }

  return json({ token: MAPBOX_ACCESS_TOKEN });
};
