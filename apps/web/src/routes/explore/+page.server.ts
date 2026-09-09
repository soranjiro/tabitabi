import type { ApiResult, PublicFeedResponse } from '@tabitabi/types';
import type { PageServerLoad } from './$types';

const API_BASE_URL =
  (import.meta.env.PUBLIC_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:8787/api/v1';

export const prerender = false;

export const load: PageServerLoad = async ({ fetch, setHeaders }) => {
  // The explore feed is public and changes much less often than it is read.
  // A short edge TTL removes the API/D1 round-trip from repeat document loads
  // while stale-while-revalidate keeps the page responsive during refreshes.
  setHeaders({
    'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=600',
  });

  try {
    const response = await fetch(`${API_BASE_URL}/users?offset=0`);
    if (!response.ok) return { feed: null };

    const result: ApiResult<PublicFeedResponse> = await response.json();
    return { feed: result.success ? result.data : null };
  } catch {
    // Keep the page available if the API is temporarily unavailable.
    // The client will retry after hydration.
    return { feed: null };
  }
};
