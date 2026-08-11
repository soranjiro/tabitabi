import type { CreatePackingItemInput, PackingData, PackingItem, UpdatePackingCheckInput, UpdatePackingItemInput } from '@tabitabi/types';
import { apiClient } from './client';

export const packingApi = {
  get: (itineraryId: string) => apiClient.get<PackingData>(`/itineraries/${itineraryId}/packing`, itineraryId),
  addItem: (itineraryId: string, input: CreatePackingItemInput) => apiClient.post<PackingItem>(`/itineraries/${itineraryId}/packing/items`, input, itineraryId),
  updateItem: (itineraryId: string, itemId: string, input: UpdatePackingItemInput) => apiClient.put<PackingItem>(`/itineraries/${itineraryId}/packing/items/${itemId}`, input, itineraryId),
  updateCheck: (itineraryId: string, itemId: string, input: UpdatePackingCheckInput) => apiClient.put<{ checked: boolean }>(`/itineraries/${itineraryId}/packing/items/${itemId}/check`, input, itineraryId),
  deleteItem: (itineraryId: string, itemId: string) => apiClient.delete(`/itineraries/${itineraryId}/packing/items/${itemId}`, itineraryId),
};
