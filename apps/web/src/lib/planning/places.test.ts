import { describe, it, expect } from 'vitest';
import { getPlace, updatePlace, distanceKm } from './places';
import { getStepSchedule, updateStepSchedule } from './schedule';
import { getMemoText } from '$lib/memo';
describe('planning places', () => {
  it('preserves notes and schedule across coordinate edits and removal', () => {
    const notes = updateStepSchedule('雨なら美術館', {precision:'undecided'});
    const pinned = updatePlace(notes, {lat:35, lng:135, priority:true});
    expect(getPlace(pinned)?.priority).toBe(true);
    expect(getStepSchedule({notes:pinned}).precision).toBe('undecided');
    expect(getMemoText(updatePlace(pinned,null))).toBe('雨なら美術館');
    expect(getPlace(updatePlace(pinned,null))).toBeNull();
  });
  it('rejects corrupt and out of range coordinates', () => {
    for (const place of [{lat:91,lng:135},{lat:35,lng:181},{lat:'35',lng:135},null]) {
      expect(getPlace(JSON.stringify({tabitabi_place:place}))).toBeNull();
    }
    expect(getPlace('古いメモ')).toBeNull();
  });
  it('measures straight line distance, including identical locations', () => {
    expect(distanceKm({lat:0,lng:0},{lat:0,lng:1})).toBeCloseTo(111.195,2);
    expect(distanceKm({lat:35,lng:135},{lat:35,lng:135})).toBe(0);
  });
});
