import type { TripMember } from '@tabitabi/types';
import { apiClient } from './client';

export const membersApi = {
  get: (itineraryId: string) => apiClient.get<TripMember[]>(`/itineraries/${itineraryId}/members`, itineraryId),
  add: (itineraryId: string, name: string) => apiClient.post<TripMember>(`/itineraries/${itineraryId}/members`, { name }, itineraryId),
  update: (itineraryId: string, memberId: string, name: string) => apiClient.put<TripMember>(`/itineraries/${itineraryId}/members/${memberId}`, { name }, itineraryId),
  delete: (itineraryId: string, memberId: string) => apiClient.delete(`/itineraries/${itineraryId}/members/${memberId}`, itineraryId),
};
