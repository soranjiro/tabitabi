import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async () => {
  const GOOGLE_MAPS_API_KEY = env.GOOGLE_MAPS_API_KEY;
  if (!GOOGLE_MAPS_API_KEY) {
    throw error(500, 'Google Maps API key not configured');
  }

  return json({ apiKey: GOOGLE_MAPS_API_KEY });
};
