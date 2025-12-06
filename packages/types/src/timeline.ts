export interface TimelineStep {
  id: string;
  itineraryId: string;
  stepOrder: number;
  title: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  createdAt: string;
}

export interface CreateTimelineStepInput {
  title: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
}

export interface UpdateTimelineStepInput {
  title?: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
}
