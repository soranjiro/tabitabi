import { describe, expect, it } from "vitest";
import { getStepSchedule, getStepTimeLabel, updateStepSchedule } from "./schedule";

const step = {
  notes: '{"text":"朝が良さそう","booking_url":"https://example.com"}',
  start_at: new Date("2026-09-01T10:30:00").getTime(),
  is_all_day: false,
} as any;

describe("planning schedule metadata", () => {
  it("treats existing steps as time-decided", () => {
    expect(getStepSchedule(step)).toEqual({ precision: "time" });
  });

  it("stores a day-only state without losing memo fields", () => {
    const notes = updateStepSchedule(step.notes, { precision: "day", day: 2, order: 3 });
    expect(getStepSchedule({ notes } as any)).toEqual({ precision: "day", day: 2, order: 3 });
    expect(JSON.parse(notes)).toMatchObject({ text: "朝が良さそう", booking_url: "https://example.com" });
  });

  it("labels a day-only step as time undecided", () => {
    const notes = updateStepSchedule(step.notes, { precision: "day", day: 1 });
    expect(getStepTimeLabel({ ...step, notes })).toBe("時間未定");
  });
});
