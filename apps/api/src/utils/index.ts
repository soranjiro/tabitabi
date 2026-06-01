export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS?: string;
  JWT_SECRET?: string;
  AFFILIATE_TEMPLATE_JALAN?: string;
  AFFILIATE_TEMPLATE_RAKUTEN_TRAVEL?: string;
  AFFILIATE_TEMPLATE_IKYU?: string;
  AFFILIATE_TEMPLATE_BOOKING?: string;
  AFFILIATE_TEMPLATE_AGODA?: string;
  AFFILIATE_TEMPLATE_TABELOG?: string;
  AFFILIATE_TEMPLATE_GNAVI?: string;
  AFFILIATE_TEMPLATE_HOTPEPPER?: string;
  AFFILIATE_TEMPLATE_ASOVIEW?: string;
  AFFILIATE_TEMPLATE_KLOOK?: string;
  AFFILIATE_TEMPLATE_RAKUTEN_MARKET?: string;
  AFFILIATE_TEMPLATE_YAHOO_SHOPPING?: string;
  AFFILIATE_TEMPLATE_DEFAULT?: string;
}

export interface Variables {
  shioriId?: string;
  userId?: string;
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}
