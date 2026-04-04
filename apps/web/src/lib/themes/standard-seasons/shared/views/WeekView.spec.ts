import { describe, it, expect } from 'vitest';
import type { Step } from '@tabitabi/types';
import { getOverlappingStepsForDay, getEventStyleForDay, DEFAULT_HOURS } from './weekview-utils';

describe('WeekView utils', () => {
  it('computes a single positioned event for a 9:00-11:30 step', () => {
    const date = '2024-01-01';
    const startAt = new Date(`${date}T09:00:00`).getTime();
    const endAt = new Date(`${date}T11:30:00`).getTime();
    const step: Step = {
      id: 's1',
      itinerary_id: 'it1',
      title: 'Test',
      start_at: startAt,
      end_at: endAt,
      location: null,
      notes: '',
      type: 'normal:general',
      is_hidden: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const positioned = getOverlappingStepsForDay([step], date);
    expect(positioned.length).toBe(1);
    const p = positioned[0];
    const style = getEventStyleForDay(DEFAULT_HOURS, p.relStart, p.relEnd, p.index, p.totalCount);
    expect(style).toMatch(/top:\s*\d+px/);
    expect(style).toMatch(/height:\s*\d+px/);
  });
});
