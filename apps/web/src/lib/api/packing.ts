import type { CreatePackingGroupInput, CreatePackingItemInput, PackingData, PackingGroup, PackingItem, ReorderPackingGroupsInput, UpdatePackingCheckInput, UpdatePackingGroupInput, UpdatePackingItemInput } from '@tabitabi/types';
import { apiClient } from './client';

export const packingApi = {
  get: (itineraryId: string) => apiClient.get<PackingData>(`/itineraries/${itineraryId}/packing`, itineraryId),
  addItem: (itineraryId: string, input: CreatePackingItemInput) => apiClient.post<PackingItem>(`/itineraries/${itineraryId}/packing/items`, input, itineraryId),
  updateItem: (itineraryId: string, itemId: string, input: UpdatePackingItemInput) => apiClient.put<PackingItem>(`/itineraries/${itineraryId}/packing/items/${itemId}`, input, itineraryId),
  updateCheck: (itineraryId: string, itemId: string, input: UpdatePackingCheckInput) => apiClient.put<{ checked: boolean }>(`/itineraries/${itineraryId}/packing/items/${itemId}/check`, input, itineraryId),
  deleteItem: (itineraryId: string, itemId: string) => apiClient.delete(`/itineraries/${itineraryId}/packing/items/${itemId}`, itineraryId),
  addGroup: (itineraryId: string, input: CreatePackingGroupInput) => apiClient.post<PackingGroup>(`/itineraries/${itineraryId}/packing/groups`, input, itineraryId),
  reorderGroups: (itineraryId: string, input: ReorderPackingGroupsInput) => apiClient.put<PackingGroup[]>(`/itineraries/${itineraryId}/packing/groups/order`, input, itineraryId),
  updateGroup: (itineraryId: string, groupId: string, input: UpdatePackingGroupInput) => apiClient.put<PackingGroup>(`/itineraries/${itineraryId}/packing/groups/${groupId}`, input, itineraryId),
  deleteGroup: (itineraryId: string, groupId: string) => apiClient.delete<{ reassigned_to_group_id: string }>(`/itineraries/${itineraryId}/packing/groups/${groupId}`, itineraryId),
};
