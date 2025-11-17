export interface Env {
  DB: D1Database;
}

export function generateId(length: number = 32): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
