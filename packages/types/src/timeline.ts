// Step types - シンプル版
export interface Step {
  id: string;
  itineraryId: string;
  orderNum: number;
  title: string;
  time?: string | null;
  location?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface CreateStepInput {
  title: string;
  time?: string;
  location?: string;
  note?: string;
}

export interface UpdateStepInput {
  title?: string;
  time?: string | null;
  location?: string | null;
  note?: string | null;
}
