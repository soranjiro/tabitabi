import { describe, it, expect } from 'vitest';
import { STEP_TYPE } from "@tabitabi/types";
import type { Step } from '@tabitabi/types';
import { getOverlappingStepsForDay, getEventStyleForDay, getWeekHours, DEFAULT_HOURS } from './weekview-utils';

describe('WeekView utils', () => {
  it('computes positions for a multi-hour event as a single positioned item', () => {
    const date = '2024-01-02';
    const step: Step = {
      id: 's1',
      itinerary_id: 'it1',
      title: 'Long Event',
      start_at: new Date(2024, 0, 2, 9, 0).getTime(),
      end_at: new Date(2024, 0, 2, 11, 30).getTime(),
      location: null,
      notes: '',
      type: STEP_TYPE.NORMAL_GENERAL,
      is_hidden: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const positioned = getOverlappingStepsForDay([step], date);
    expect(positioned.length).toBe(1);
    const p = positioned[0];
    const style = getEventStyleForDay(DEFAULT_HOURS, p.relStart, p.relEnd, p.index, p.totalCount);
    expect(style).toMatch(/height:\s*\d+px/);
  });

  it('extends visible hours to 23:00 when a step exists after 21:00', () => {
    const step: Step = {
      id: 's-late',
      itinerary_id: 'it1',
      title: 'Late Event',
      start_at: new Date(2024, 0, 2, 21, 45).getTime(),
      end_at: new Date(2024, 0, 2, 22, 30).getTime(),
      location: null,
      notes: '',
      type: STEP_TYPE.NORMAL_GENERAL,
      is_hidden: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const hours = getWeekHours([step]);
    expect(hours[0]).toBe(6);
    expect(hours[hours.length - 1]).toBe(23);
  });
});
