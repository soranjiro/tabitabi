import type { Step } from '@tabitabi/types';
export interface Place { lat: number; lng: number; priority?: boolean }
export function getPlace(step: Pick<Step, 'pin_latitude' | 'pin_longitude' | 'is_priority'>): Place | null {
  const lat = step.pin_latitude;
  const lng = step.pin_longitude;
  return lat != null && lng != null && Number.isFinite(lat) && Math.abs(lat) <= 85.051129 && Number.isFinite(lng) && Math.abs(lng) <= 180
    ? { lat, lng, priority: step.is_priority }
    : null;
}
export function placeFields(place: Place | null) {
  return {
    pin_latitude: place?.lat ?? null,
    pin_longitude: place?.lng ?? null,
    is_priority: place?.priority ?? false,
  };
}
export function distanceKm(a: Place, b: Place): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat-a.lat)*rad/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1-h)));
}
