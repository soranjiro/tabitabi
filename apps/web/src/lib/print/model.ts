import {
  getStepDate,
  getStepEndTime,
  getStepTime,
  type Step,
} from "@tabitabi/types";

export type PrintTemplateId = "week" | "editorial" | "timeline";
export type PrintOrientation = "portrait" | "landscape";

export interface PrintDay {
  date: string;
  dayIndex: number;
  steps: Step[];
  continuation?: boolean;
}

export interface WeekPrintPage {
  weekStart: string;
  days: PrintDay[];
  continuation: number;
}

export interface TemplateAvailability {
  available: boolean;
  reason?: string;
}

export const PRINT_TEMPLATES: Array<{
  id: PrintTemplateId;
  name: string;
  description: string;
  badge: string;
  orientation: PrintOrientation;
}> = [
  {
    id: "week",
    name: "週間プラン",
    description: "1週間を横並びで俯瞰。予定が多い日は続きページへ自動分割します。",
    badge: "STANDARD",
    orientation: "landscape",
  },
  {
    id: "editorial",
    name: "デザイナーズしおり",
    description: "雑誌のような表紙と日別紙面。短い旅行を美しくまとめます。",
    badge: "PREMIUM",
    orientation: "portrait",
  },
  {
    id: "timeline",
    name: "詳細タイムライン",
    description: "メモや場所も含めて読みやすく収録。長い旅程向けです。",
    badge: "FLEXIBLE",
    orientation: "portrait",
  },
];

export function sortSteps(steps: Step[]): Step[] {
  return [...steps].sort((a, b) => a.start_at - b.start_at);
}

export function groupStepsByDay(steps: Step[]): PrintDay[] {
  const groups = new Map<string, Step[]>();
  for (const step of sortSteps(steps)) {
    const date = getStepDate(step);
    const group = groups.get(date);
    if (group) group.push(step);
    else groups.set(date, [step]);
  }
  return Array.from(groups, ([date, daySteps], dayIndex) => ({
    date,
    dayIndex,
    steps: daySteps,
  }));
}

function toLocalDate(date: string): Date {
  return new Date(`${date}T00:00:00`);
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getMonday(dateKey: string): string {
  const date = toLocalDate(dateKey);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  return toDateKey(date);
}

export function buildWeekPages(
  days: PrintDay[],
  perDayCapacity = 6,
): WeekPrintPage[] {
  if (days.length === 0) return [];
  const byWeek = new Map<string, PrintDay[]>();
  for (const day of days) {
    const weekStart = getMonday(day.date);
    const group = byWeek.get(weekStart);
    if (group) group.push(day);
    else byWeek.set(weekStart, [day]);
  }

  const pages: WeekPrintPage[] = [];
  for (const [weekStart, weekDays] of byWeek) {
    const dayMap = new Map(weekDays.map((day) => [day.date, day]));
    const maxChunks = Math.max(
      1,
      ...weekDays.map((day) => Math.ceil(day.steps.length / perDayCapacity)),
    );

    for (let chunk = 0; chunk < maxChunks; chunk += 1) {
      const pageDays: PrintDay[] = [];
      for (let offset = 0; offset < 7; offset += 1) {
        const date = toLocalDate(weekStart);
        date.setDate(date.getDate() + offset);
        const dateKey = toDateKey(date);
        const source = dayMap.get(dateKey);
        pageDays.push({
          date: dateKey,
          dayIndex: source?.dayIndex ?? -1,
          steps:
            source?.steps.slice(
              chunk * perDayCapacity,
              (chunk + 1) * perDayCapacity,
            ) ?? [],
          continuation: chunk > 0,
        });
      }
      pages.push({ weekStart, days: pageDays, continuation: chunk });
    }
  }
  return pages;
}

function stepWeight(step: Step): number {
  const noteLength = step.notes?.length ?? 0;
  const locationLength = step.location?.length ?? 0;
  return 1.1 + Math.min(noteLength / 130, 2.2) + Math.min(locationLength / 80, 0.4);
}

export function buildTimelinePages(
  days: PrintDay[],
  capacity = 13.5,
): PrintDay[][] {
  const pages: PrintDay[][] = [];
  let current: PrintDay[] = [];
  let currentWeight = 0;

  const flush = () => {
    if (current.length > 0) pages.push(current);
    current = [];
    currentWeight = 0;
  };

  for (const day of days) {
    let segment: Step[] = [];
    let segmentWeight = 1.8;
    let continuation = false;

    const pushSegment = () => {
      if (segment.length === 0) return;
      if (current.length > 0 && currentWeight + segmentWeight > capacity) flush();
      current.push({ ...day, steps: segment, continuation });
      currentWeight += segmentWeight;
      segment = [];
      segmentWeight = 1.8;
      continuation = true;
    };

    for (const step of day.steps) {
      const weight = stepWeight(step);
      if (segment.length > 0 && segmentWeight + weight > capacity) pushSegment();
      if (current.length > 0 && currentWeight + segmentWeight + weight > capacity) {
        pushSegment();
        flush();
      }
      segment.push(step);
      segmentWeight += weight;
    }
    pushSegment();
  }
  flush();
  return pages;
}

export function getTemplateAvailability(
  template: PrintTemplateId,
  days: PrintDay[],
  memo = "",
): TemplateAvailability {
  if (template !== "editorial") return { available: true };
  const stepCount = days.reduce((total, day) => total + day.steps.length, 0);
  if (days.length > 4) {
    return { available: false, reason: "4日以内の旅程で利用できます" };
  }
  if (stepCount > 24) {
    return { available: false, reason: "予定が24件以内の旅程で利用できます" };
  }
  if (days.some((day) => day.steps.length > 6)) {
    return { available: false, reason: "1日の予定が6件以内の旅程で利用できます" };
  }
  if (memo.length > 1200 || days.some((day) => day.steps.some((step) => step.notes.length > 500))) {
    return { available: false, reason: "長いメモを含むため詳細版をご利用ください" };
  }
  return { available: true };
}

export function formatPrintDate(dateKey: string, includeYear = false): string {
  return toLocalDate(dateKey).toLocaleDateString("ja-JP", {
    ...(includeYear ? { year: "numeric" as const } : {}),
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function formatPrintTime(step: Step): string {
  if (step.is_all_day) return "終日";
  const start = getStepTime(step);
  const end = getStepEndTime(step);
  return start === end ? start : `${start}–${end}`;
}

export function getTravelDateLabel(days: PrintDay[]): string {
  if (days.length === 0) return "日程未定";
  const first = formatPrintDate(days[0].date, true);
  if (days.length === 1) return first;
  return `${first} — ${formatPrintDate(days[days.length - 1].date, true)}`;
}
