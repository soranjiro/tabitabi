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
  return parseMemoData(notes).text;
}

export function stringifyMemoData(data: MemoData): string {
  return JSON.stringify({ ...data, text: data.text || '' });
}

export function getMemoText(memo: string | null | undefined): string {
  const parsedMemo = parseMemoData(memo);
  return parsedMemo.text;
}

export function updateMemoText(memo: string | null | undefined, text: string): string {
  const data = parseMemoData(memo);
  data.text = text;
  return stringifyMemoData(data);
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
