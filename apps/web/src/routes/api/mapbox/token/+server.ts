import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
  const MAPBOX_ACCESS_TOKEN = env.MAPBOX_ACCESS_TOKEN;
  if (!MAPBOX_ACCESS_TOKEN) {
    throw error(500, 'Mapbox token not configured');
  }

  return json({ token: MAPBOX_ACCESS_TOKEN });
};
