import type {
  BootstrapProfileInput,
  UserBookmarkWithItinerary,
  PublicBookmark,
  PublicFeedResponse,
  UpdateVisibilityInput,
  UserPublicProfile,
  SyncBookmarksResponse,
  UpdateProfileInput,
  UpdateProfileResponse,
  UserSearchResult,
  ApiResult,
  UserSessionProfile,
  PublishItineraryInput,
  PublishItineraryResponse,
} from '@tabitabi/types';
import { userAuth } from '../user-auth';

const API_BASE_URL =
  (import.meta.env.PUBLIC_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:8787/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await userAuth.getToken();
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const result: ApiResult<T> = await response.json();
  if (!result.success) throw new Error(result.error.message);
  return result.data;
}

let favoriteIdsPromise: Promise<Set<string>> | null = null;

function clearFavoriteCache() {
  favoriteIdsPromise = null;
}

export const userApi = {
  bootstrap: (data: BootstrapProfileInput = {}) =>
    request<UserSessionProfile>('/users/me/bootstrap', { method: 'POST', body: JSON.stringify(data) }),

  getAccount: () => request<UserSessionProfile>('/users/me/account'),

  getPublicProfile: (username: string) =>
    request<UserPublicProfile>(`/users/${username}/profile`),

  getPublicBookmarks: (username: string) =>
    request<{ username: string; bookmarks: PublicBookmark[] }>(`/users/${username}/bookmarks`),

  getMyBookmarks: () =>
    request<{ bookmarks: UserBookmarkWithItinerary[] }>('/users/me/bookmarks'),

  updateVisibility: (itineraryId: string, data: UpdateVisibilityInput) =>
    request<{ itinerary_id: string; is_visible: boolean }>(
      `/users/me/bookmarks/${itineraryId}/visibility`,
      { method: 'PATCH', body: JSON.stringify(data) }
    ),

  syncBookmarks: (itineraryIds: string[]) =>
    request<SyncBookmarksResponse>('/users/me/sync-bookmarks', {
      method: 'POST',
      body: JSON.stringify({ itinerary_ids: itineraryIds }),
    }),

  updateProfile: (data: UpdateProfileInput) =>
    request<UpdateProfileResponse>('/users/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  publishBookmark: (itineraryId: string, data: PublishItineraryInput) =>
    request<PublishItineraryResponse>(`/users/me/bookmarks/${itineraryId}/publish`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  unpublishBookmark: (itineraryId: string) =>
    request<{ unpublished: boolean }>(`/users/me/bookmarks/${itineraryId}/publication`, {
      method: 'DELETE',
    }),

  unlinkBookmark: (itineraryId: string) =>
    request<{ unlinked: boolean }>(`/users/me/bookmarks/${itineraryId}`, {
      method: 'DELETE',
    }),

  getPublicFeed: (offset: number, filters: { prefecture?: string; tag?: string } = {}) => {
    const params = new URLSearchParams({ offset: String(offset) });
    if (filters.prefecture) params.set('prefecture', filters.prefecture);
    if (filters.tag) params.set('tag', filters.tag);
    return request<PublicFeedResponse>(`/users?${params}`);
  },

  searchUsers: (query: string) =>
    request<{ users: UserSearchResult[] }>(`/users/search?q=${encodeURIComponent(query)}`),

  getFavoriteIds: async () => {
    favoriteIdsPromise ??= request<{ itinerary_ids: string[] }>('/favorites')
      .then(({ itinerary_ids }) => new Set(itinerary_ids));
    return favoriteIdsPromise;
  },

  addFavorite: async (itineraryId: string) => {
    const result = await request<{ itinerary_id: string; favorited: boolean }>(`/favorites/${itineraryId}`, { method: 'PUT' });
    clearFavoriteCache();
    return result;
  },

  removeFavorite: async (itineraryId: string) => {
    const result = await request<{ itinerary_id: string; favorited: boolean }>(`/favorites/${itineraryId}`, { method: 'DELETE' });
    clearFavoriteCache();
    return result;
  },
};