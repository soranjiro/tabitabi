import type { Itinerary, CreateItineraryInput, UpdateItineraryInput } from '@tabitabi/types';
import { apiClient } from './client';

export const itineraryApi = {
  list: () => apiClient.get<Itinerary[]>('/itineraries'),

  get: (id: string) => apiClient.get<Itinerary>(`/itineraries/${id}`),

  create: (data: CreateItineraryInput) =>
    apiClient.post<Itinerary>('/itineraries', data),

  update: (id: string, data: UpdateItineraryInput) =>
    apiClient.put<Itinerary>(`/itineraries/${id}`, data),

  delete: (id: string) => apiClient.delete(`/itineraries/${id}`),
};
