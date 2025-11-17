export interface Itinerary {
  id: string;                    // 長いランダムID（32文字）
  title: string;
  theme_id: string;              // デフォルト: 'minimal'
  created_at: string;
  updated_at: string;
}

export interface CreateItineraryInput {
  title: string;
  theme_id?: string;             // オプション、デフォルト: 'minimal'
}

export interface UpdateItineraryInput {
  title?: string;
  theme_id?: string;
}
