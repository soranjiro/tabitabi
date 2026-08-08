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

  getPublicFeed: (offset: number) =>
    request<PublicFeedResponse>(`/users?offset=${offset}`),

  searchUsers: (query: string) =>
    request<{ users: UserSearchResult[] }>(`/users/search?q=${encodeURIComponent(query)}`),
};
