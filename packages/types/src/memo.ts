export interface MemoData {
  text: string;
  booking_url?: string;
  affiliate_url?: string;
  affiliate_provider?: string;
  affiliate_disclosure?: string;
  [key: string]: unknown;
}

export const DEFAULT_MEMO: MemoData = { text: '' };
