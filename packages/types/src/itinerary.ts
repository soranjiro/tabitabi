export interface ItinerarySecretSettings {
  enabled: boolean;
  offset_minutes: number;
}

/** Standard theme layouts that can be selected as the opening view. */
export type ItineraryViewMode = 'dayCard' | 'list' | 'month' | 'week';

export interface Itinerary {
  id: string;
  title: string;
  theme_id: string;
  /** Opening view chosen by the itinerary owner. Older itineraries use dayCard. */
  default_view_mode?: ItineraryViewMode;
  memo: string;
  password?: string | null;
  secret_settings?: ItinerarySecretSettings | null;
  fork_count?: number;
  source_itinerary_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ForkItineraryResponse {
  id: string;
  title: string;
  theme_id: string;
  token: string;
}

export interface PublishItineraryResponse {
  id: string;
}

// フロントエンドに返すItinerary（パスワード情報は除外、保護フラグを追加）
export type ItineraryResponse = Omit<Itinerary, 'password'> & {
  is_password_protected: boolean;
};

export interface CreateItineraryInput {
  title: string;
  theme_id?: string;             // オプション、デフォルト: 'map-only'
  default_view_mode?: ItineraryViewMode;
  memo?: string;
  password?: string;
  secret_settings?: {
    enabled: boolean;
    offset_minutes: number;
  };
}

export interface UpdateItineraryInput {
  title?: string;
  theme_id?: string;
  default_view_mode?: ItineraryViewMode;
  memo?: string;
  password?: string;
  secret_settings?: {
    enabled: boolean;
    offset_minutes: number;
  } | null;
}
