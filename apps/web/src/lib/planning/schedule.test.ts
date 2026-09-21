import { describe, expect, it } from "vitest";
import { getStepSchedule, getStepTimeLabel } from "./schedule";

const step = {
  notes: '{"text":"朝が良さそう","booking_url":"https://example.com"}',
  start_at: new Date("2026-09-01T10:30:00").getTime(),
  time_unspecified: false,
  sort_order: null,
  is_all_day: false,
} as any;

describe("planning schedule metadata", () => {
  it("treats existing steps as time-decided", () => {
    expect(getStepSchedule(step)).toEqual({ precision: "time", order: undefined });
  });

  it("reads a day-only state from regular columns", () => {
    expect(getStepSchedule({ ...step, time_unspecified: true, sort_order: 3 })).toEqual({ precision: "day", order: 3 });
  });

  it("labels a day-only step as time undecided", () => {
    expect(getStepTimeLabel({ ...step, time_unspecified: true })).toBe("時間未定");
  });
});
