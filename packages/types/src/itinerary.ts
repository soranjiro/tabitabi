// Itinerary types - 超シンプル版
export interface Itinerary {
  id: string;
  title: string;
  createdAt: string;
}

export interface CreateItineraryInput {
  title: string;
}

export interface UpdateItineraryInput {
  title?: string;
}
