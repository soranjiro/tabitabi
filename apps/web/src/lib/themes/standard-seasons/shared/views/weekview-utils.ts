import type { Step } from '@tabitabi/types';

export const DEFAULT_HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

export function getWeekDatesFromSteps(steps: Step[]): Date[] {
  if (steps.length === 0) return [];

  let minDay = Infinity;
  let maxDay = -Infinity;

  for (const s of steps) {
    const sd = new Date(s.start_at);
    sd.setHours(0, 0, 0, 0);
    const ed = new Date(s.end_at);
    ed.setHours(0, 0, 0, 0);
    minDay = Math.min(minDay, sd.getTime());
    maxDay = Math.max(maxDay, ed.getTime());
  }

  const weekDates: Date[] = [];
  const current = new Date(minDay);
  while (current.getTime() <= maxDay) {
    weekDates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return weekDates;
}

export function getOverlappingStepsForDay(
  steps: Step[],
  dateStr: string,
): Array<{ step: Step; index: number; totalCount: number; relStart: number; relEnd: number }> {
  const DAY_START = new Date(`${dateStr}T00:00:00`).getTime();
  const DAY_END = DAY_START + 24 * 60 * 60 * 1000;

  const daySteps = steps.filter((s) => s.start_at < DAY_END && s.end_at > DAY_START);

  const enriched = daySteps.map((s) => {
    const relStart = Math.max(0, Math.floor((Math.max(s.start_at, DAY_START) - DAY_START) / 60000));
    const relEnd = Math.min(24 * 60, Math.ceil((Math.min(s.end_at, DAY_END) - DAY_START) / 60000));
    return { step: s, relStart, relEnd };
  });

  enriched.sort((a, b) => a.relStart - b.relStart || a.relEnd - b.relEnd);

  const positioned: {
    step: Step;
    index: number;
    totalCount: number;
    relStart: number;
    relEnd: number;
  }[] = [];

  for (const item of enriched) {
    const conflicting = enriched.filter((o) => o.step !== item.step && !(o.relEnd <= item.relStart || o.relStart >= item.relEnd));
    const assignedIndex = conflicting.filter((o) => o.relStart < item.relStart).length;
    const maxOverlapCount = Math.max(1, conflicting.length + 1);

    positioned.push({
      step: item.step,
      index: assignedIndex,
      totalCount: maxOverlapCount,
      relStart: item.relStart,
      relEnd: item.relEnd,
    });
  }

  return positioned;
}

export function getEventStyleForDay(
  hours: number[],
  relStart: number,
  relEnd: number,
  index: number,
  totalCount: number,
): string {
  const hoursStartMin = hours[0] * 60;
  const hoursEndMin = (hours[hours.length - 1] + 1) * 60;

  const visibleStart = Math.max(relStart, hoursStartMin);
  const visibleEnd = Math.min(relEnd, hoursEndMin);
  const durationMinutes = Math.max(15, visibleEnd - visibleStart);

  const topOffsetMinutes = Math.max(0, visibleStart - hoursStartMin);
  const top = (topOffsetMinutes / 60) * 40;
  const height = Math.max((durationMinutes / 60) * 40, 38);
  const width = 100 / totalCount;
  const left = index * width;

  return `top: ${top}px; height: ${height}px; left: ${left}%; width: ${width}%;`;
}
