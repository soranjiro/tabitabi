export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  JWT_SECRET?: string;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
