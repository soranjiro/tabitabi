export interface Env {
  DB: D1Database;
}

// ランダムなID生成（短くて読みやすい）
export function generateId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
