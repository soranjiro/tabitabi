import type {
  ComparisonGroup, CreateComparisonGroupInput, UpdateComparisonGroupInput,
} from '@tabitabi/types';
import { apiClient } from './client';

function path(itineraryId: string) {
  return `/itineraries/${encodeURIComponent(itineraryId)}/comparisons`;
}

export const comparisonApi = {
  list: (itineraryId: string) => apiClient.get<ComparisonGroup[]>(path(itineraryId), itineraryId),
  create: (itineraryId: string, data: CreateComparisonGroupInput) =>
    apiClient.post<ComparisonGroup>(path(itineraryId), data, itineraryId),
  update: (itineraryId: string, groupId: string, data: UpdateComparisonGroupInput) =>
    apiClient.put<ComparisonGroup>(`${path(itineraryId)}/${encodeURIComponent(groupId)}`, data, itineraryId),
  delete: (itineraryId: string, groupId: string) =>
    apiClient.delete<null>(`${path(itineraryId)}/${encodeURIComponent(groupId)}`, itineraryId),
};
