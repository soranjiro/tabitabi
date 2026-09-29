import { describe, expect, it } from "vitest";
import { buildStepOrderUpdates, getStepSchedule, getStepTimeLabel } from "./schedule";

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


describe("planning step ordering", () => {
  it("normalizes missing order values while moving a step", () => {
    expect(buildStepOrderUpdates([
      { id: "a", sort_order: null },
      { id: "b", sort_order: 0 },
      { id: "c", sort_order: null },
    ], "a", 1)).toEqual([
      { id: "a", sort_order: 1 },
      { id: "c", sort_order: 2 },
    ]);
  });

  it("resolves duplicate order values deterministically", () => {
    expect(buildStepOrderUpdates([
      { id: "a", sort_order: 0 },
      { id: "b", sort_order: 0 },
    ], "a", 1)).toEqual([
      { id: "a", sort_order: 1 },
    ]);
  });
});
