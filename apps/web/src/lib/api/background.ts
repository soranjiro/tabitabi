import { apiClient } from './client';

export const backgroundApi = {
  get: (itineraryId: string) =>
    apiClient.get<BackgroundSettings>(`/backgrounds/${itineraryId}`),

  update: (itineraryId: string, settings: BackgroundSettings) =>
    apiClient.put<BackgroundSettings>(
      `/backgrounds/${itineraryId}`,
      settings,
      itineraryId,
    ),
};

export interface BackgroundSettings {
  cover_background_image: string | null;
  page_background_image: string | null;
}
