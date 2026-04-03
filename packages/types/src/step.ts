export type StepType =
  | 'normal:general'
  | 'normal:food'
  | 'normal:hotel'
  | 'normal:sightseeing'
  | 'transport:general'
  | 'transport:train'
  | 'transport:car'
  | 'transport:plane'
  | 'transport:bus';

export interface Step {
  id: string;
  itinerary_id: string;
  title: string;
  start_at: number;
  end_at: number;
  location?: string | null;
  notes: string;
  type?: StepType;
  is_hidden?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStepInput {
  itinerary_id: string;
  title: string;
  // Unix timestamp in milliseconds
  start_at: number;
  // Unix timestamp in milliseconds
  end_at?: number;
  location?: string;
  notes?: string;
  type?: StepType;
}

export interface UpdateStepInput {
  title?: string;
  // Unix timestamp in milliseconds
  start_at?: number;
  // Unix timestamp in milliseconds
  end_at?: number;
  location?: string | null;
  notes?: string | null;
  type?: StepType;
}

export function getStepDate(step: Step): string {
  const d = new Date(step.start_at);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getStepTime(step: Step): string {
  const d = new Date(step.start_at);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function getStepEndTime(step: Step): string {
  const d = new Date(step.end_at);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function createTimestamp(date: string, time: string, timezone?: string): number {
  // Helper for UI: constructs a Unix ms timestamp from date + time (and optional timezone)
  if (timezone) {
    const dtStr = `${date}T${time}:00`;
    const utcDate = new Date(dtStr + 'Z');
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const localParts = formatter.formatToParts(utcDate);
    const getPart = (type: string) => localParts.find(p => p.type === type)?.value || '00';
    const offsetMs = utcDate.getTime() - new Date(
      `${getPart('year')}-${getPart('month')}-${getPart('day')}T${getPart('hour')}:${getPart('minute')}:${getPart('second')}Z`
    ).getTime();
    return new Date(dtStr + 'Z').getTime() - offsetMs;
  }
  return new Date(`${date}T${time}:00`).getTime();
}

export function createEndTimestamp(startAt: number, durationMinutes: number = 60): number {
  // startAt must be a Unix ms number
  return startAt + durationMinutes * 60 * 1000;
}

export function parseTimestampInput(value: number | undefined | null): number | null {
  // Strict: only accept numeric Unix ms timestamps. Legacy ISO strings are not accepted.
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}
