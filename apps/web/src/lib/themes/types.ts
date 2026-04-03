import type {
  Itinerary,
  Step,
  ItinerarySecretRecord,
  ItineraryWalicaSettingsRecord
} from '@tabitabi/types';

export interface DemoDataSet {
  itinerary: Itinerary;
  steps: Step[];
  itinerary_secrets?: ItinerarySecretRecord | null;
  itinerary_walica_settings?: ItineraryWalicaSettingsRecord | null;
}

export const now = new Date().toISOString();

export function getDate(offsetDays: number = 0, timeZone: string = 'Asia/Tokyo'): string {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/\//g, '-');
}

export function getTimestamp(offsetDays: number = 0, time: string = '09:00', timeZone: string = 'Asia/Tokyo'): number {
  const date = getDate(offsetDays, timeZone);
  if (timeZone === 'Asia/Tokyo') {
    return new Date(`${date}T${time}:00+09:00`).getTime();
  }
  return new Date(`${date}T${time}:00`).getTime();
}

export function getEndTimestamp(startAt: number, durationMinutes: number = 60): number {
  return startAt + durationMinutes * 60 * 1000;
}
