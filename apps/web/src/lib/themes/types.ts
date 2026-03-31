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
