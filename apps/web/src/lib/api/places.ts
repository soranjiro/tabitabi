import type { PlaceAutocompleteResponse, PlaceDetailsResponse } from '@tabitabi/types';

async function getJson<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
  const url = new URL(path, window.location.origin);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}

export async function autocompletePlaces(input: string, sessionToken?: string): Promise<PlaceAutocompleteResponse> {
  return getJson('/api/places/autocomplete', { input, sessionToken });
}

export async function getPlaceDetails(placeId: string, sessionToken?: string): Promise<PlaceDetailsResponse> {
  return getJson('/api/places/details', { placeId, sessionToken });
}
