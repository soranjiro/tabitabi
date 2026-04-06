import type { Itinerary, CreateItineraryInput, UpdateItineraryInput, ItineraryResponse, ForkItineraryResponse } from '@tabitabi/types';
import { apiClient } from './client';
import { userAuth } from '../user-auth';

export const itineraryApi = {
  list: () => apiClient.get<ItineraryResponse[]>('/itineraries'),

  get: (id: string) => apiClient.get<ItineraryResponse>(`/itineraries/${id}`),

  create: (data: CreateItineraryInput) => {
    const userToken = userAuth.getToken();
    if (userToken) {
      return apiClient.postWithUserToken<ItineraryResponse & { token: string }>('/itineraries', data, userToken);
    }
    return apiClient.post<ItineraryResponse & { token: string }>('/itineraries', data);
  },

  update: (id: string, data: UpdateItineraryInput) =>
    apiClient.put<ItineraryResponse>(`/itineraries/${id}`, data, id),

  delete: (id: string) => apiClient.delete(`/itineraries/${id}`, id),

  fork: (id: string) => {
    const userToken = userAuth.getToken();
    if (!userToken) throw new Error('Not logged in');
    return apiClient.postWithUserToken<ForkItineraryResponse>(`/itineraries/${id}/fork`, {}, userToken);
  },
};
