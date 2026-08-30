import type { Step } from "@tabitabi/types";
import { parseMemoData, stringifyMemoData } from "$lib/memo";

export type SchedulePrecision = "undecided" | "day" | "time";

export interface StepSchedule {
  precision: SchedulePrecision;
  day?: number;
  order?: number;
}

const SCHEDULE_KEY = "tabitabi_schedule";

export function getStepSchedule(step: Pick<Step, "notes">): StepSchedule {
  const value = parseMemoData(step.notes)[SCHEDULE_KEY];
  if (!value || typeof value !== "object") return { precision: "time" };

  const record = value as Record<string, unknown>;
  const precision = record.precision;
  if (precision !== "undecided" && precision !== "day" && precision !== "time") {
    return { precision: "time" };
  }

  const day = typeof record.day === "number" && Number.isInteger(record.day) && record.day > 0
    ? record.day
    : undefined;
  const order = typeof record.order === "number" && Number.isFinite(record.order)
    ? record.order
    : undefined;

  return { precision, day, order };
}

export function updateStepSchedule(notes: string | null | undefined, schedule: StepSchedule): string {
  const data = parseMemoData(notes);
  data[SCHEDULE_KEY] = schedule;
  return stringifyMemoData(data);
}

export function getStepTimeLabel(step: Step): string {
  const schedule = getStepSchedule(step);
  if (schedule.precision !== "time") return "時間未定";
  if (step.is_all_day) return "終日";
  const date = new Date(step.start_at);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

