export interface ItinerarySecretRecord {
  itinerary_id: string;
  enabled: boolean;
  offset_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface ItineraryWalicaSettingsRecord {
  itinerary_id: string;
  walica_id: string;
  created_at: string;
  updated_at: string;
}
