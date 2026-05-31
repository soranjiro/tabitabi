import { env } from '$env/dynamic/private';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { fetchPlaceAutocomplete, getGooglePlacesConfig } from '$lib/server/googlePlaces';

export const GET: RequestHandler = async ({ url }) => {
  const input = url.searchParams.get('input') ?? '';
  const sessionToken = url.searchParams.get('sessionToken');
  const config = getGooglePlacesConfig(env);

  if (!input.trim()) return json({ suggestions: [] });
  if (!config.apiKey && !env.GOOGLE_PLACES_API_BASE_URL) {
    throw error(500, 'Google Places API key not configured');
  }

  try {
    const suggestions = await fetchPlaceAutocomplete(input, sessionToken, config);
    return json({ suggestions });
  } catch (e) {
    throw error(502, e instanceof Error ? e.message : 'Google Places autocomplete failed');
  }
};
