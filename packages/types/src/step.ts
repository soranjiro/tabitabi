export interface Step {
  id: string;
  itinerary_id: string;
  title: string;                 // 必須
  date: string;                  // 必須: YYYY-MM-DD形式
  time: string;                  // 必須: HH:mm形式
  location?: string | null;      // オプション
  notes?: string | null;         // オプション
  is_hidden?: boolean;           // シークレットモード用
  created_at: string;
  updated_at: string;
}

export interface CreateStepInput {
  itinerary_id: string;          // 必須
  title: string;                 // 必須
  date: string;                  // 必須: YYYY-MM-DD形式
  time: string;                  // 必須: HH:mm形式
  location?: string;
  notes?: string;
}

export interface UpdateStepInput {
  title?: string;
  date?: string;
  time?: string;
  location?: string | null;
  notes?: string | null;
}
