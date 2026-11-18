import type { CreatePackingGroupInput, CreatePackingItemInput, PackingData, PackingGroup, PackingItem, ReorderPackingGroupsInput, TripMember, UpdatePackingCheckInput, UpdatePackingGroupInput, UpdatePackingItemInput } from '@tabitabi/types';
import { apiClient } from './client';

export const packingApi = {
  get: (itineraryId: string) => apiClient.get<PackingData>(`/itineraries/${itineraryId}/packing`, itineraryId),
  updatePermissions: (itineraryId: string, requires_edit_permission: boolean) =>
    apiClient.put<{ requires_edit_permission: boolean }>(`/itineraries/${itineraryId}/packing/permissions`, { requires_edit_permission }, itineraryId),
  addMember: (itineraryId: string, name: string) =>
    apiClient.post<TripMember>(`/itineraries/${itineraryId}/packing/members`, { name }, itineraryId),
  addItem: (itineraryId: string, input: CreatePackingItemInput) => apiClient.post<PackingItem>(`/itineraries/${itineraryId}/packing/items`, input, itineraryId),
  updateItem: (itineraryId: string, itemId: string, input: UpdatePackingItemInput) => apiClient.put<PackingItem>(`/itineraries/${itineraryId}/packing/items/${itemId}`, input, itineraryId),
  updateCheck: (itineraryId: string, itemId: string, input: UpdatePackingCheckInput) => apiClient.put<{ checked: boolean }>(`/itineraries/${itineraryId}/packing/items/${itemId}/check`, input, itineraryId),
  deleteItem: (itineraryId: string, itemId: string) => apiClient.delete(`/itineraries/${itineraryId}/packing/items/${itemId}`, itineraryId),
  addGroup: (itineraryId: string, input: CreatePackingGroupInput) => apiClient.post<PackingGroup>(`/itineraries/${itineraryId}/packing/groups`, input, itineraryId),
  reorderGroups: (itineraryId: string, input: ReorderPackingGroupsInput) => apiClient.put<PackingGroup[]>(`/itineraries/${itineraryId}/packing/groups/order`, input, itineraryId),
  updateGroup: (itineraryId: string, groupId: string, input: UpdatePackingGroupInput) => apiClient.put<PackingGroup>(`/itineraries/${itineraryId}/packing/groups/${groupId}`, input, itineraryId),
  deleteGroup: (itineraryId: string, groupId: string) => apiClient.delete<{ reassigned_to_group_id: string }>(`/itineraries/${itineraryId}/packing/groups/${groupId}`, itineraryId),
};
