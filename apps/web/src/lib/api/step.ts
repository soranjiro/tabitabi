import type { Step, CreateStepInput, UpdateStepInput } from '@tabitabi/types';
import { apiClient } from './client';

export const stepApi = {
  list: (itineraryId: string) =>
    apiClient.get<Step[]>(`/itineraries/${itineraryId}/steps`),

  create: (itineraryId: string, data: CreateStepInput) =>
    apiClient.post<Step>(`/itineraries/${itineraryId}/steps`, data),

  update: (stepId: string, data: UpdateStepInput) =>
    apiClient.put<Step>(`/itineraries/steps/${stepId}`, data),

  delete: (stepId: string) =>
    apiClient.delete(`/itineraries/steps/${stepId}`),
};
