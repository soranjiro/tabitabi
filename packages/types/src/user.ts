export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface UserPublicProfile {
  username: string;
  created_at: string;
}

export interface UserBookmark {
  user_id: string;
  itinerary_id: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBookmarkWithItinerary extends UserBookmark {
  title: string;
  theme_id: string;
  is_password_protected: boolean;
}

export interface PublicBookmark {
  itinerary_id: string;
  title: string;
  theme_id: string;
  created_at: string;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: UserPublicProfile;
}

export interface RegisterResponse {
  token: string;
  user: UserPublicProfile;
}

export interface UpdateVisibilityInput {
  is_visible: boolean;
}

export interface SyncBookmarksInput {
  itinerary_ids: string[];
}

export interface SyncBookmarksResponse {
  synced: number;
  skipped: number;
}

export interface UpdateProfileInput {
  username?: string;
  email?: string;
}

export interface UpdatePasswordInput {
  current_password: string;
  new_password: string;
}

export interface UpdateProfileResponse {
  username: string;
  created_at: string;
}
