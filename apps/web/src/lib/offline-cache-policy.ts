/**
 * Only cache publicly distributed static assets. Never persist navigations,
 * itinerary/profile pages or JSON responses in the service worker CacheStorage.
 * Those responses can contain user-specific or edit-capability data.
 */
export function mayCacheOffline(
  request: Pick<Request, 'url' | 'method' | 'mode' | 'headers' | 'cache'>,
  origin: string,
  buildAssets: ReadonlySet<string>,
): boolean {
  if (request.method !== 'GET' || request.mode === 'navigate'
    || request.headers.has('Authorization') || request.cache === 'no-store') return false;

  const url = new URL(request.url);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) return false;
  if (buildAssets.has(url.pathname)) return true;

  // Public, non-personalized images. Query-bearing assets are deliberately
  // excluded so signed URLs and sensitive query strings never enter storage.
  return !url.search && /^\/(?:hero|itinerary-backgrounds)\//.test(url.pathname)
    && /\.(?:avif|webp|png|jpe?g|gif|svg)$/i.test(url.pathname);
}
