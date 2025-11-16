import type { TimelineStep, CreateTimelineStepInput, UpdateTimelineStepInput } from '@tabitabi/types';
import { apiClient } from './client';

export const timelineApi = {
  list: (itineraryId: string) =>
    apiClient.get<TimelineStep[]>(`/itineraries/${itineraryId}/timeline`),

  create: (itineraryId: string, data: CreateTimelineStepInput) =>
    apiClient.post<TimelineStep>(`/itineraries/${itineraryId}/timeline/steps`, data),

  update: (stepId: string, data: UpdateTimelineStepInput) =>
    apiClient.put<TimelineStep>(`/itineraries/timeline/steps/${stepId}`, data),

  delete: (stepId: string) =>
    apiClient.delete(`/itineraries/timeline/steps/${stepId}`),

  reorder: (stepId: string, newOrder: number) =>
    apiClient.post(`/itineraries/timeline/steps/${stepId}/reorder`, { newOrder }),
};
