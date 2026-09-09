import type { Step, CreateStepInput, UpdateStepInput, BatchStepDateUpdate } from '@tabitabi/types';
import { apiClient } from './client';

export const stepApi = {
  list: (itineraryId: string) =>
    apiClient.get<Step[]>(`/steps?itinerary_id=${itineraryId}`, itineraryId),

  get: (stepId: string) =>
    apiClient.get<Step>(`/steps/${stepId}`),

  create: (data: CreateStepInput, itineraryId: string) =>
    apiClient.post<Step>('/steps', data, itineraryId),

  update: (stepId: string, data: UpdateStepInput, itineraryId: string) =>
    apiClient.put<Step>(`/steps/${stepId}`, data, itineraryId),

  updateDates: (itineraryId: string, updates: BatchStepDateUpdate[]) =>
    apiClient.put<Step[]>('/steps/batch-date', { itinerary_id: itineraryId, updates }, itineraryId),

  delete: (stepId: string, itineraryId: string) =>
    apiClient.delete(`/steps/${stepId}`, itineraryId),
};
