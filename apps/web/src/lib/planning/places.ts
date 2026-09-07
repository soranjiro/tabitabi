import { parseMemoData, stringifyMemoData } from '$lib/memo';
export interface Place { lat: number; lng: number; priority?: boolean }
export function getPlace(notes: string | null | undefined): Place | null {
  const value = parseMemoData(notes).tabitabi_place as Place | undefined;
  return value && Number.isFinite(value.lat) && Math.abs(value.lat) <= 85.051129 && Number.isFinite(value.lng) && Math.abs(value.lng) <= 180 ? value : null;
}
export function updatePlace(notes: string | null | undefined, place: Place | null): string {
  const data = parseMemoData(notes);
  if (place) data.tabitabi_place = place;
  else delete data.tabitabi_place;
  return stringifyMemoData(data);
}
export function distanceKm(a: Place, b: Place): number {
  const rad = Math.PI / 180;
  const h = Math.sin((b.lat-a.lat)*rad/2)**2 + Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin((b.lng-a.lng)*rad/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1-h)));
}
