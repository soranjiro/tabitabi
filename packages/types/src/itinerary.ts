export interface Itinerary {
  id: string;                    // 長いランダムID（32文字）
  title: string;
  theme_id: string;              // デフォルト: 'minimal'
  memo?: string;
  password?: string;
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
