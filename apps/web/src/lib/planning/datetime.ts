export type PlanningWhen = 'undecided' | 'day' | 'time';

function timestampFor(dateValue: string, time: string): number {
  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
}

export function nextLocalDate(dateValue: string): string {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function planningDateRange(input: { when: PlanningWhen; date: string; time: string; endDate: string; endTime: string }) {
  if (input.when === 'undecided') return { start_at: null, end_at: null, time_unspecified: false };
  const start_at = timestampFor(input.date, input.when === 'day' ? '12:00' : input.time);
  const end_at = input.when === 'day' ? start_at + 60 * 60 * 1000 : timestampFor(input.endDate, input.endTime);
  if (!Number.isFinite(start_at) || !Number.isFinite(end_at) || end_at <= start_at) {
    throw new Error('終了日時は開始日時より後に設定してください。日を跨ぐ場合は終了日を翌日にしてください。');
  }
  return { start_at, end_at, time_unspecified: input.when === 'day' };
}
