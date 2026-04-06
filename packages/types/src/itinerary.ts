export interface ItinerarySecretSettings {
  enabled: boolean;
  offset_minutes: number;
}

export interface Itinerary {
  id: string;
  title: string;
  theme_id: string;
  memo: string;
  walica_id?: string | null;
  password?: string | null;
  secret_settings?: ItinerarySecretSettings | null;
  fork_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ForkItineraryResponse {
  id: string;
  title: string;
  theme_id: string;
  token: string;
}

// フロントエンドに返すItinerary（パスワード情報は除外、保護フラグを追加）
export type ItineraryResponse = Omit<Itinerary, 'password'> & {
  is_password_protected: boolean;
};

export interface CreateItineraryInput {
  title: string;
  theme_id?: string;             // オプション、デフォルト: 'map-only'
  memo?: string;
  walica_id?: string;
  password?: string;
  secret_settings?: {
    enabled: boolean;
    offset_minutes: number;
  };
}

export interface UpdateItineraryInput {
  title?: string;
  theme_id?: string;
  memo?: string;
  walica_id?: string | null;
  password?: string;
  secret_settings?: {
    enabled: boolean;
    offset_minutes: number;
  } | null;
}
