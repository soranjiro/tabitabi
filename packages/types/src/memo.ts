export interface MemoData {
  text: string;
  [key: string]: unknown;
}

export const DEFAULT_MEMO: MemoData = { text: '' };
