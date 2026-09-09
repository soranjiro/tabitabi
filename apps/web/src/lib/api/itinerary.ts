import type { Itinerary, CreateItineraryInput, UpdateItineraryInput, ItineraryResponse, ForkItineraryResponse, PublishItineraryResponse } from '@tabitabi/types';
import { apiClient } from './client';

async function getUserToken() {
  const { userAuth } = await import('../user-auth');
  return userAuth.getToken();
}

export const itineraryApi = {
  list: () => apiClient.get<ItineraryResponse[]>('/itineraries'),

  get: (id: string) => apiClient.get<ItineraryResponse>(`/itineraries/${id}`),

  create: async (data: CreateItineraryInput) => {
    const userToken = await getUserToken();
    if (userToken) {
      return apiClient.postWithUserToken<ItineraryResponse & { token: string }>('/itineraries', data, userToken);
    }
    return apiClient.post<ItineraryResponse & { token: string }>('/itineraries', data);
  },

  update: (id: string, data: UpdateItineraryInput) =>
    apiClient.put<ItineraryResponse>(`/itineraries/${id}`, data, id),

  delete: (id: string) => apiClient.delete(`/itineraries/${id}`, id),

  fork: async (id: string, content?: { itinerary: ItineraryResponse; steps: import('@tabitabi/types').Step[] }) => {
    const userToken = await getUserToken();
    if (!userToken) return apiClient.post<ForkItineraryResponse>(`/itineraries/${id}/fork`, content ?? {});
    return apiClient.postWithUserToken<ForkItineraryResponse>(`/itineraries/${id}/fork`, content ?? {}, userToken);
  },

  publish: (id: string) =>
    apiClient.post<PublishItineraryResponse>(`/itineraries/${id}/publish`, {}, id),
};
