import type { PlanGraph, UpdatePlanGraphInput } from '@tabitabi/types';
import { apiClient } from './client';

export const planGraphApi = {
  get: (itineraryId: string) => apiClient.get<PlanGraph>(
    '/itineraries/' + encodeURIComponent(itineraryId) + '/plan-graph', itineraryId,
  ),
  save: (itineraryId: string, value: UpdatePlanGraphInput) => apiClient.put<PlanGraph>(
    '/itineraries/' + encodeURIComponent(itineraryId) + '/plan-graph', value, itineraryId,
  ),
};
