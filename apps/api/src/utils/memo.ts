const MAX_MEMO_SIZE = 100 * 1024;

export function validateMemoJson(memo: string): { valid: boolean; error?: string } {
  if (!memo) {
    return { valid: false, error: 'Memo is required' };
  }

  if (memo.length > MAX_MEMO_SIZE) {
    return { valid: false, error: `Memo exceeds maximum size of ${MAX_MEMO_SIZE} bytes` };
  }

  try {
    const parsed = JSON.parse(memo);
    if (typeof parsed !== 'object' || parsed === null) {
      return { valid: false, error: 'Memo must be a JSON object' };
    }
    if (typeof parsed.text !== 'string') {
      return { valid: false, error: 'Memo must have a "text" field of type string' };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: 'Memo must be valid JSON' };
  }
}
