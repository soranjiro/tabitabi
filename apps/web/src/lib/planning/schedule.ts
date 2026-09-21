import type { Step } from "@tabitabi/types";

export type SchedulePrecision = "undecided" | "day" | "time";

export interface StepSchedule {
  precision: SchedulePrecision;
  order?: number;
}

export function getStepSchedule(step: Pick<Step, "start_at" | "time_unspecified" | "sort_order">): StepSchedule {
  return {
    precision: step.start_at === null ? "undecided" : step.time_unspecified ? "day" : "time",
    order: step.sort_order ?? undefined,
  };
}

export function getStepTimeLabel(step: Step): string {
  const schedule = getStepSchedule(step);
  if (schedule.precision !== "time") return "時間未定";
  if (step.is_all_day) return "終日";
  if (step.start_at === null) return "時間未定";
  const date = new Date(step.start_at);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
