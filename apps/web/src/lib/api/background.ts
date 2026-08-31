import { apiClient } from './client';

export const backgroundApi = {
  get: (itineraryId: string) =>
    apiClient.get<{ background_image: string | null }>(`/backgrounds/${itineraryId}`),

  update: (itineraryId: string, backgroundImage: string | null) =>
    apiClient.put<{ background_image: string | null }>(
      `/backgrounds/${itineraryId}`,
      { background_image: backgroundImage },
      itineraryId,
    ),
};
