export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

export function getDayNumber(dates: string[], currentDate: string): number {
  const sortedDates = [...new Set(dates)].sort();
  return sortedDates.indexOf(currentDate) + 1;
}

export function isSecretStep(
  stepDate: string,
  stepTime: string,
  offsetMinutes: number
): boolean {
  const now = new Date();
  const stepDateTime = new Date(`${stepDate}T${stepTime}`);
  const revealTime = new Date(stepDateTime.getTime() - offsetMinutes * 60 * 1000);
  return now < revealTime;
}

export function getTimeUntilReveal(
  stepDate: string,
  stepTime: string,
  offsetMinutes: number
): string {
  const now = new Date();
  const stepDateTime = new Date(`${stepDate}T${stepTime}`);
  const revealTime = new Date(stepDateTime.getTime() - offsetMinutes * 60 * 1000);

  const diff = revealTime.getTime() - now.getTime();
  if (diff <= 0) return '';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}日後に公開`;
  }
  if (hours > 0) {
    return `${hours}時間${minutes}分後に公開`;
  }
  return `${minutes}分後に公開`;
}
