import type { MemoData } from '@tabitabi/types';

export const DEFAULT_MEMO: MemoData = { text: '' };
export const DEFAULT_MEMO_JSON = JSON.stringify(DEFAULT_MEMO);

export function parseMemoData(memo: string | null | undefined): MemoData {
  if (!memo) return { ...DEFAULT_MEMO };
  try {
    const parsed = JSON.parse(memo);
    if (typeof parsed === 'object' && parsed !== null) {
      return { text: '', ...parsed };
    }
  } catch {
    return { text: memo };
  }
  return { ...DEFAULT_MEMO };
}

export function getNotesText(notes: string | null | undefined): string {
  return notes ?? '';
}

export function stringifyMemoData(data: MemoData): string {
  return JSON.stringify({ ...data, text: data.text || '' });
}

export function getMemoText(memo: string | null | undefined): string {
  return memo ?? '';
}

export function updateMemoText(memo: string | null | undefined, text: string): string {
  return sanitizeMemoText(text);
}

export function mergeMemoData<T extends MemoData>(
  memo: string | null | undefined,
  updates: Partial<T>
): string {
  const data = parseMemoData(memo) as T;
  return stringifyMemoData({ ...data, ...updates });
}

export function removeMemoFields(
  memo: string | null | undefined,
  fields: string[]
): string {
  const data = parseMemoData(memo);
  for (const field of fields) {
    if (field !== 'text') {
      delete data[field];
    }
  }
  return stringifyMemoData(data);
}

/**
 * Memo/notes are Markdown source, not HTML. Do not mutate user content with
 * regex-based tag removal: overlapping tags can defeat it and the mutation
 * also damages harmless plain text. Escape/sanitize when rendering instead
 * (Svelte text interpolation or the restricted Markdown renderer).
 */
export function sanitizeMemoText(text: string): string {
  return text;
}
