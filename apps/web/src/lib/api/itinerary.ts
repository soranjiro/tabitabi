import type { Itinerary, CreateItineraryInput, UpdateItineraryInput, ItineraryResponse } from '@tabitabi/types';
import { apiClient } from './client';

export const itineraryApi = {
  list: () => apiClient.get<ItineraryResponse[]>('/itineraries'),

  get: (id: string) => apiClient.get<ItineraryResponse>(`/itineraries/${id}`),

  create: (data: CreateItineraryInput) =>
    apiClient.post<ItineraryResponse & { token: string }>('/itineraries', data),

  update: (id: string, data: UpdateItineraryInput) =>
    apiClient.put<ItineraryResponse>(`/itineraries/${id}`, data, id),

  delete: (id: string) => apiClient.delete(`/itineraries/${id}`, id),
};
