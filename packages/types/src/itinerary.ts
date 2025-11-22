export interface Itinerary {
  id: string;
  title: string;
  theme_id: string;
  memo?: string | null;
  password?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateItineraryInput {
  title: string;
  theme_id?: string;             // オプション、デフォルト: 'minimal'
  memo?: string;
  password?: string;
}

export interface UpdateItineraryInput {
  title?: string;
  theme_id?: string;
  memo?: string;
  password?: string;
}
