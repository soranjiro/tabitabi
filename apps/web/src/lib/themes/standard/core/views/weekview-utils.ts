import type { Step } from '@tabitabi/types';

export const WEEK_VIEW_START_HOUR = 6;
export const WEEK_VIEW_DEFAULT_END_HOUR = 21;
export const WEEK_VIEW_EXTENDED_END_HOUR = 23;
export const WEEK_VIEW_ROW_HEIGHT = 56;

export const DEFAULT_HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

export function getWeekHours(steps: Step[]): number[] {
  if (steps.length === 0) {
    return DEFAULT_HOURS;
  }

  const showUntilEndOfDay = steps.some((step) => {
    const start = new Date(step.start_at);
    const end = new Date(step.end_at);
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    return startMinutes >= WEEK_VIEW_DEFAULT_END_HOUR * 60 || endMinutes >= WEEK_VIEW_DEFAULT_END_HOUR * 60;
  });

  const endHour = showUntilEndOfDay ? WEEK_VIEW_EXTENDED_END_HOUR : WEEK_VIEW_DEFAULT_END_HOUR;
  const length = endHour - WEEK_VIEW_START_HOUR + 1;
  return Array.from({ length }, (_, i) => i + WEEK_VIEW_START_HOUR);
}

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

  const columns: { end: number }[] = [];

  for (const item of enriched) {
    let placed = false;
    for (let col = 0; col < columns.length; col++) {
      if (columns[col].end <= item.relStart) {
        columns[col].end = item.relEnd;
        const conflicting = enriched.filter(
          (o) => o.step !== item.step && !(o.relEnd <= item.relStart || o.relStart >= item.relEnd)
        );
        positioned.push({
          step: item.step,
          index: col,
          totalCount: Math.max(columns.length, conflicting.length + 1),
          relStart: item.relStart,
          relEnd: item.relEnd,
        });
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push({ end: item.relEnd });
      const conflicting = enriched.filter(
        (o) => o.step !== item.step && !(o.relEnd <= item.relStart || o.relStart >= item.relEnd)
      );
      positioned.push({
        step: item.step,
        index: columns.length - 1,
        totalCount: Math.max(columns.length, conflicting.length + 1),
        relStart: item.relStart,
        relEnd: item.relEnd,
      });
    }
  }

  for (const pos of positioned) {
    const conflicting = positioned.filter(
      (o) => o.step !== pos.step && !(o.relEnd <= pos.relStart || o.relStart >= pos.relEnd)
    );
    const maxCol = Math.max(pos.index, ...conflicting.map(c => c.index));
    pos.totalCount = maxCol + 1;
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
  const top = (topOffsetMinutes / 60) * WEEK_VIEW_ROW_HEIGHT;
  const height = Math.max((durationMinutes / 60) * WEEK_VIEW_ROW_HEIGHT, 38);
  const width = 100 / totalCount;
  const left = index * width;

  return `top: ${top}px; height: ${height}px; left: ${left}%; width: ${width}%;`;
}
