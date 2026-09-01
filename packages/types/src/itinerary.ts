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
  /** Color palette is independent from the selected layout preset. */
  palette_id?: string;
  /** Cover image path/URL. Presets use static paths now; uploaded photos can reuse this field later. */
  background_image?: string | null;
  /** Feature switches belong to the itinerary, not to a visual theme. */
  packing_enabled?: boolean;
  /** Search/discovery metadata shared by every owner and publication of this itinerary. */
  prefecture_slugs?: string[];
  areas?: string[];
  tags?: string[];
  /** False only until the first metadata prompt has been handled. */
  metadata_initialized?: boolean;
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
  theme_id?: string;             // オプション、デフォルト: planning-draft
  palette_id?: string;
  packing_enabled?: boolean;
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
  palette_id?: string;
  packing_enabled?: boolean;
  prefecture_slugs?: string[];
  areas?: string[];
  tags?: string[];
  metadata_initialized?: boolean;
  memo?: string;
  password?: string;
  secret_settings?: {
    enabled: boolean;
    offset_minutes: number;
  } | null;
}
