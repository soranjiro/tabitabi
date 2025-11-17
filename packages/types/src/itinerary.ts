// Itinerary types
export interface Itinerary {
  id: string;
  title: string;
  startDate?: string;
  endDate?: string;
  themeId?: string;
  createdAt: string;
}

export interface CreateItineraryInput {
  title: string;
  startDate?: string;
  endDate?: string;
  themeId?: string;
}

export interface UpdateItineraryInput {
  title?: string;
  startDate?: string;
  endDate?: string;
  themeId?: string;
}
