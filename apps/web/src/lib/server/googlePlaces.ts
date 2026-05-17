import type { PlaceStructuredData, PlaceSuggestion } from '@tabitabi/types';

export const DEFAULT_GOOGLE_PLACES_API_BASE_URL = 'https://places.googleapis.com/v1';

export interface GooglePlacesConfig {
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

interface GooglePlacesAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      place?: string;
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      types?: string[];
    };
  }>;
}

interface GooglePlaceDetailsResponse {
  id?: string;
  name?: string;
  types?: string[];
  formattedAddress?: string;
  googleMapsUri?: string;
  displayName?: { text?: string };
  location?: {
    latitude?: number;
    longitude?: number;
  };
  addressComponents?: PlaceStructuredData['addressComponents'];
}

export function getGooglePlacesConfig(env: Record<string, string | undefined>): Required<Pick<GooglePlacesConfig, 'baseUrl'>> & Pick<GooglePlacesConfig, 'apiKey'> {
  return {
    apiKey: env.GOOGLE_PLACES_API_KEY || env.GOOGLE_MAPS_API_KEY,
    baseUrl: env.GOOGLE_PLACES_API_BASE_URL || DEFAULT_GOOGLE_PLACES_API_BASE_URL,
  };
}

function normalizeBaseUrl(baseUrl = DEFAULT_GOOGLE_PLACES_API_BASE_URL): string {
  return baseUrl.replace(/\/+$/, '');
}

function getHeaders(apiKey?: string, fieldMask?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (apiKey) headers['X-Goog-Api-Key'] = apiKey;
  if (fieldMask) headers['X-Goog-FieldMask'] = fieldMask;

  return headers;
}

function getPlaceId(placeNameOrId: string | undefined): string | undefined {
  if (!placeNameOrId) return undefined;
  return placeNameOrId.startsWith('places/')
    ? placeNameOrId.slice('places/'.length)
    : placeNameOrId;
}

export function mapAutocompleteResponse(data: GooglePlacesAutocompleteResponse): PlaceSuggestion[] {
  return (data.suggestions ?? [])
    .map((suggestion) => {
      const prediction = suggestion.placePrediction;
      const placeId = getPlaceId(prediction?.placeId || prediction?.place);
      const text = prediction?.text?.text;

      if (!prediction || !placeId || !text) return null;

      return {
        placeId,
        text,
        mainText: prediction.structuredFormat?.mainText?.text,
        secondaryText: prediction.structuredFormat?.secondaryText?.text,
        types: prediction.types,
      } satisfies PlaceSuggestion;
    })
    .filter((suggestion): suggestion is PlaceSuggestion => suggestion !== null);
}

export function mapPlaceDetails(data: GooglePlaceDetailsResponse): PlaceStructuredData {
  const placeId = getPlaceId(data.id || data.name);
  const displayName = data.displayName?.text || data.formattedAddress || placeId;

  if (!placeId || !displayName) {
    throw new Error('Google Place Details response did not include a place id or display name');
  }

  return {
    placeId,
    displayName,
    formattedAddress: data.formattedAddress,
    latitude: data.location?.latitude,
    longitude: data.location?.longitude,
    googleMapsUri: data.googleMapsUri,
    types: data.types,
    addressComponents: data.addressComponents,
    source: 'google_places',
    fetchedAt: new Date().toISOString(),
  };
}

async function assertGoogleResponse(response: Response): Promise<void> {
  if (response.ok) return;

  let message = 'Google Places API request failed';
  try {
    const data = await response.json() as { error?: { message?: string } };
    message = data.error?.message || message;
  } catch {
    // Keep the generic message if the upstream response is not JSON.
  }

  throw new Error(message);
}

export async function fetchPlaceAutocomplete(
  input: string,
  sessionToken: string | null,
  config: GooglePlacesConfig = {},
): Promise<PlaceSuggestion[]> {
  const trimmedInput = input.trim();
  if (!trimmedInput) return [];

  const fetchImpl = config.fetchFn ?? fetch;
  const response = await fetchImpl(`${normalizeBaseUrl(config.baseUrl)}/places:autocomplete`, {
    method: 'POST',
    headers: getHeaders(
      config.apiKey,
      'suggestions.placePrediction.place,suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text,suggestions.placePrediction.types',
    ),
    body: JSON.stringify({
      input: trimmedInput,
      languageCode: 'ja',
      ...(sessionToken ? { sessionToken } : {}),
    }),
  });

  await assertGoogleResponse(response);
  return mapAutocompleteResponse(await response.json() as GooglePlacesAutocompleteResponse);
}

export async function fetchPlaceDetails(
  placeId: string,
  sessionToken: string | null,
  config: GooglePlacesConfig = {},
): Promise<PlaceStructuredData> {
  const trimmedPlaceId = placeId.trim();
  if (!trimmedPlaceId) throw new Error('placeId is required');

  const fetchImpl = config.fetchFn ?? fetch;
  const url = new URL(`${normalizeBaseUrl(config.baseUrl)}/places/${encodeURIComponent(trimmedPlaceId)}`);
  url.searchParams.set('languageCode', 'ja');
  if (sessionToken) url.searchParams.set('sessionToken', sessionToken);

  const response = await fetchImpl(url, {
    headers: getHeaders(
      config.apiKey,
      'id,displayName,formattedAddress,location,googleMapsUri,types,addressComponents',
    ),
  });

  await assertGoogleResponse(response);
  return mapPlaceDetails(await response.json() as GooglePlaceDetailsResponse);
}
