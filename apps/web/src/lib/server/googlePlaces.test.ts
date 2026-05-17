import { describe, expect, it, vi } from 'vitest';
import {
  fetchPlaceAutocomplete,
  fetchPlaceDetails,
  getGooglePlacesConfig,
  mapAutocompleteResponse,
  mapPlaceDetails,
} from './googlePlaces';

describe('googlePlaces', () => {
  it('maps Google autocomplete suggestions to app suggestions', () => {
    const suggestions = mapAutocompleteResponse({
      suggestions: [
        {
          placePrediction: {
            place: 'places/mock-google-place-tokyo-station',
            text: { text: '東京駅' },
            structuredFormat: {
              mainText: { text: '東京駅' },
              secondaryText: { text: '東京都千代田区' },
            },
            types: ['train_station'],
          },
        },
      ],
    });

    expect(suggestions).toEqual([
      {
        placeId: 'mock-google-place-tokyo-station',
        text: '東京駅',
        mainText: '東京駅',
        secondaryText: '東京都千代田区',
        types: ['train_station'],
      },
    ]);
  });

  it('maps Google place details to structured data', () => {
    const place = mapPlaceDetails({
      id: 'mock-google-place-tokyo-station',
      displayName: { text: '東京駅' },
      formattedAddress: '日本、〒100-0005 東京都千代田区丸の内１丁目',
      location: { latitude: 35.681236, longitude: 139.767125 },
      googleMapsUri: 'https://maps.google.com/?cid=mock-tokyo-station',
      types: ['train_station'],
    });

    expect(place).toMatchObject({
      placeId: 'mock-google-place-tokyo-station',
      displayName: '東京駅',
      formattedAddress: '日本、〒100-0005 東京都千代田区丸の内１丁目',
      latitude: 35.681236,
      longitude: 139.767125,
      googleMapsUri: 'https://maps.google.com/?cid=mock-tokyo-station',
      source: 'google_places',
    });
    expect(new Date(place.fetchedAt).toString()).not.toBe('Invalid Date');
  });

  it('prefers the dedicated Places key and mock base URL from env', () => {
    expect(getGooglePlacesConfig({
      GOOGLE_PLACES_API_KEY: 'places-key',
      GOOGLE_MAPS_API_KEY: 'maps-key',
      GOOGLE_PLACES_API_BASE_URL: 'http://localhost:8789/v1',
    })).toEqual({
      apiKey: 'places-key',
      baseUrl: 'http://localhost:8789/v1',
    });
  });

  it('sends field masks and session tokens to Google endpoints', async () => {
    const fetchFn = vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (String(url).includes('places:autocomplete')) {
        expect(init?.headers).toMatchObject({ 'X-Goog-Api-Key': 'test-key' });
        expect(init?.headers).toHaveProperty('X-Goog-FieldMask');
        expect(JSON.parse(String(init?.body))).toMatchObject({ input: '東京', sessionToken: 'session-1' });
        return Response.json({ suggestions: [] });
      }

      expect(String(url)).toContain('/places/mock-google-place-tokyo-station');
      expect(String(url)).toContain('sessionToken=session-1');
      expect(init?.headers).toHaveProperty('X-Goog-FieldMask');
      return Response.json({ id: 'mock-google-place-tokyo-station', displayName: { text: '東京駅' } });
    });

    await expect(fetchPlaceAutocomplete('東京', 'session-1', {
      apiKey: 'test-key',
      baseUrl: 'http://mock.test/v1',
      fetchFn: fetchFn as unknown as typeof fetch,
    })).resolves.toEqual([]);

    await expect(fetchPlaceDetails('mock-google-place-tokyo-station', 'session-1', {
      apiKey: 'test-key',
      baseUrl: 'http://mock.test/v1',
      fetchFn: fetchFn as unknown as typeof fetch,
    })).resolves.toMatchObject({ displayName: '東京駅' });
  });
});
