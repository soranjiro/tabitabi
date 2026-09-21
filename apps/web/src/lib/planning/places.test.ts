import { describe, it, expect } from 'vitest';
import { getPlace, placeFields, distanceKm } from './places';
describe('planning places', () => {
  it('maps coordinate columns without touching notes', () => {
    const pinned = placeFields({lat:35, lng:135, priority:true});
    expect(getPlace(pinned)?.priority).toBe(true);
    expect(getPlace(placeFields(null))).toBeNull();
  });
  it('rejects corrupt and out of range coordinates', () => {
    for (const place of [{lat:91,lng:135},{lat:35,lng:181},{lat:'35',lng:135},null]) {
      expect(getPlace({pin_latitude:(place as any)?.lat ?? null,pin_longitude:(place as any)?.lng ?? null,is_priority:false})).toBeNull();
    }
  });
  it('measures straight line distance, including identical locations', () => {
    expect(distanceKm({lat:0,lng:0},{lat:0,lng:1})).toBeCloseTo(111.195,2);
    expect(distanceKm({lat:35,lng:135},{lat:35,lng:135})).toBe(0);
  });
});
