import { env } from '$env/dynamic/private';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchPlaceDetails, getGooglePlacesConfig } from '$lib/server/googlePlaces';

export const GET: RequestHandler = async ({ url }) => {
  const placeId = url.searchParams.get('placeId') ?? '';
  const sessionToken = url.searchParams.get('sessionToken');
  const config = getGooglePlacesConfig(env);

  if (!placeId.trim()) throw error(400, 'placeId is required');
  if (!config.apiKey && !env.GOOGLE_PLACES_API_BASE_URL) {
    throw error(500, 'Google Places API key not configured');
  }

  try {
    const place = await fetchPlaceDetails(placeId, sessionToken, config);
    return json({ place });
  } catch (e) {
    throw error(502, e instanceof Error ? e.message : 'Google Places details failed');
  }
};
