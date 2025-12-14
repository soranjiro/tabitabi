import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get('query');
  const lng = url.searchParams.get('lng');
  const lat = url.searchParams.get('lat');
  const limit = url.searchParams.get('limit') || '5';

  const MAPBOX_ACCESS_TOKEN = env.MAPBOX_ACCESS_TOKEN;
  if (!MAPBOX_ACCESS_TOKEN) {
    throw error(500, 'Mapbox token not configured');
  }

  let apiUrl: string;

  if (query) {
    apiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=${limit}&language=ja`;
  } else if (lng && lat) {
    apiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=${limit}&language=ja`;
  } else {
    throw error(400, 'Missing query or coordinates');
  }

  const res = await fetch(apiUrl);

  if (!res.ok) {
    throw error(res.status, 'Mapbox API request failed');
  }

  const data = await res.json();
  return json(data);
};
