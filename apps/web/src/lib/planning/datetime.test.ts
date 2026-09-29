import { describe, expect, it } from 'vitest';
import { nextLocalDate, planningDateRange, planningDuration, planningEndFromStart } from './datetime';

describe('planningDateRange', () => {
  it('saves title-only candidates without dates', () => {
    expect(planningDateRange({ when: 'undecided', date: '', time: '', endDate: '', endTime: '' }))
      .toEqual({ start_at: null, end_at: null, time_unspecified: false });
  });

  it('marks date-only steps as time unspecified', () => {
    const result = planningDateRange({ when: 'day', date: '2026-06-15', time: '', endDate: '', endTime: '' });
    expect(result.time_unspecified).toBe(true);
    expect(result.start_at).not.toBeNull();
  });

  it('accepts an overnight bus and rejects reversed times on the same day', () => {
    const input = { when: 'time' as const, date: '2026-06-14', time: '23:30', endDate: '2026-06-15', endTime: '07:00' };
    expect(planningDateRange(input).end_at! - planningDateRange(input).start_at!).toBe(7.5 * 60 * 60 * 1000);
    expect(() => planningDateRange({ ...input, endDate: input.date })).toThrow('終了日時');
  });

  it('advances the local calendar date', () => {
    expect(nextLocalDate('2026-12-31')).toBe('2027-01-01');
  });

  it('keeps the duration when the start time moves', () => {
    expect(planningEndFromStart({
      date: '2026-06-14',
      time: '11:30',
      durationMs: 90 * 60 * 1000,
    })).toEqual({ endDate: '2026-06-14', endTime: '13:00' });
  });

  it('moves the end date across midnight when needed', () => {
    expect(planningEndFromStart({
      date: '2026-06-14',
      time: '23:30',
      durationMs: 2 * 60 * 60 * 1000,
    })).toEqual({ endDate: '2026-06-15', endTime: '01:30' });
  });

  it('reads a manually edited duration', () => {
    expect(planningDuration({
      date: '2026-06-14',
      time: '09:00',
      endDate: '2026-06-14',
      endTime: '11:15',
    })).toBe(135 * 60 * 1000);
  });
});
