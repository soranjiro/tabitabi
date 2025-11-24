export interface ItinerarySecretSettings {
  enabled: boolean;
  offset_minutes: number;
}

export interface Itinerary {
  id: string;
  title: string;
  theme_id: string;
  memo?: string | null;
  walica_id?: string | null;
  password?: string | null;
  secret_settings?: ItinerarySecretSettings | null;
  created_at: string;
  updated_at: string;
}

export interface CreateItineraryInput {
  title: string;
  theme_id?: string;             // オプション、デフォルト: 'minimal'
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
