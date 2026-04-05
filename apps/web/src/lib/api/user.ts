import type {
  RegisterInput,
  LoginInput,
  LoginResponse,
  RegisterResponse,
  UserBookmark,
  UserBookmarkWithItinerary,
  PublicBookmark,
  UpdateVisibilityInput,
  UserPublicProfile,
  ApiResult,
} from '@tabitabi/types';
import { userAuth } from '../user-auth';

const API_BASE_URL =
  (import.meta.env.PUBLIC_API_URL as string | undefined) ||
  (import.meta.env.VITE_API_URL as string | undefined) ||
  'http://localhost:8787/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = userAuth.getToken();
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
  register: (data: RegisterInput) =>
    request<RegisterResponse>('/users/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: LoginInput) =>
    request<LoginResponse>('/users/login', { method: 'POST', body: JSON.stringify(data) }),

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

  checkOwnership: (itineraryId: string) =>
    request<UserBookmark>(`/users/me/bookmarks/${itineraryId}`),
};
