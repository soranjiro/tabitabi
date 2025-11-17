import type { Step, CreateStepInput, UpdateStepInput } from '@tabitabi/types';
import { apiClient } from './client';

export const stepApi = {
  list: (itineraryId: string) =>
    apiClient.get<Step[]>(`/steps?itinerary_id=${itineraryId}`),

  get: (stepId: string) =>
    apiClient.get<Step>(`/steps/${stepId}`),

  create: (data: CreateStepInput) =>
    apiClient.post<Step>('/steps', data),

  update: (stepId: string, data: UpdateStepInput) =>
    apiClient.put<Step>(`/steps/${stepId}`, data),

  delete: (stepId: string) =>
    apiClient.delete(`/steps/${stepId}`),
};
