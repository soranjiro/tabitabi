import { describe, expect, it } from "vitest";
import type { Step } from "@tabitabi/types";
import {
  buildTimelinePages,
  buildWeekPages,
  getTemplateAvailability,
  groupStepsByDay,
} from "./model";

function step(date: string, hour: number, notes = ""): Step {
  const start = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`).getTime();
  return {
    id: `${date}-${hour}`,
    itinerary_id: "trip",
    title: "予定",
    start_at: start,
    end_at: start + 60 * 60 * 1000,
    notes,
    created_at: "",
    updated_at: "",
  };
}

describe("print model", () => {
  it("keeps every unscheduled step in weekly output", () => {
    const candidates = Array.from({ length: 13 }, (_, i) => ({ ...step('2026-07-30', i), id: `candidate-${i}`, start_at: null, end_at: null }));
    const scheduled = step('2026-07-30', 9);
    const pages = buildWeekPages(groupStepsByDay([...candidates, scheduled]), 6);
    expect(pages.flatMap(page => page.days.flatMap(day => day.steps)).map(step => step.id).sort())
      .toEqual([...candidates, scheduled].map(step => step.id).sort());
    expect(pages.filter(page => page.weekStart === '')).toHaveLength(3);
  });
  it("splits a busy day into week continuation pages", () => {
    const days = groupStepsByDay(
      Array.from({ length: 13 }, (_, index) => step("2026-07-30", index)),
    );
    const pages = buildWeekPages(days, 6);
    expect(pages).toHaveLength(3);
    expect(pages.map((page) => page.days.flatMap((day) => day.steps).length)).toEqual([
      6, 6, 1,
    ]);
  });

  it("splits long timeline content without losing steps", () => {
    const days = groupStepsByDay(
      Array.from({ length: 20 }, (_, index) =>
        step("2026-07-30", index, "長いメモ".repeat(40)),
      ),
    );
    const pages = buildTimelinePages(days, 8);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flat(2).reduce((total, day) => total + day.steps.length, 0)).toBe(20);
  });

  it("protects the editorial layout from overcrowding", () => {
    const days = groupStepsByDay(
      Array.from({ length: 7 }, (_, index) => step("2026-07-30", index)),
    );
    expect(getTemplateAvailability("editorial", days).available).toBe(false);
  });
});
