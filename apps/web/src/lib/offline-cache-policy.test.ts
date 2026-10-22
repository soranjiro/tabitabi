import { describe, expect, it } from 'vitest';
import { mayCacheOffline } from './offline-cache-policy';

const origin = 'https://tabitabi.pages.dev';
const assets = new Set(['/_app/immutable/entry/start.abc.js']);

function request(path: string, options: RequestInit = {}) {
  return new Request(origin + path, options);
}

describe('service worker offline cache policy', () => {
  it('preserves immutable bundles and public background images', () => {
    expect(mayCacheOffline(request('/_app/immutable/entry/start.abc.js'), origin, assets)).toBe(true);
    expect(mayCacheOffline(request('/hero/background-winter.avif'), origin, assets)).toBe(true);
    expect(mayCacheOffline(request('/itinerary-backgrounds/camp.avif'), origin, assets)).toBe(true);
  });

  it('never caches pages or API responses that can contain private data', () => {
    for (const path of [
      '/', '/profile', '/itineraries/secret-book', '/s/shared-book',
      '/api/google-maps/token', '/api/feedback', '/api/v1/users/me/bookmarks',
      '/hero/../profile', '/itinerary-backgrounds/private.json',
      '/hero/background-winter.avif?token=secret',
    ]) {
      expect(mayCacheOffline(request(path), origin, assets), path).toBe(false);
    }
  });

  it('does not cache authenticated requests, non-GET methods or cross-origin content', () => {
    expect(mayCacheOffline(request('/hero/background-winter.avif', {
      headers: { Authorization: 'Bearer private' },
    }), origin, assets)).toBe(false);
    expect(mayCacheOffline(request('/hero/background-winter.avif', { method: 'POST' }), origin, assets)).toBe(false);
    expect(mayCacheOffline(new Request('https://example.com/hero/background-winter.avif'), origin, assets)).toBe(false);
  });
});
