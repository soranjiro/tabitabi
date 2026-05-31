import type { Step } from '@tabitabi/types';
import { STEP_TYPE } from '@tabitabi/types';
import type { Env } from './index';

type MemoRecord = {
  text: string;
  public_text?: string;
  public_title?: string;
  public_location?: string;
  booking_url?: string;
  affiliate_url?: string;
  affiliate_provider?: string;
  affiliate_disclosure?: string;
  [key: string]: unknown;
};

export const AFFILIATE_DISCLOSURE = 'このページにはアフィリエイトリンクが含まれます。';

const SENSITIVE_PATTERNS: RegExp[] = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /\b(?:予約番号|予約No\.?|confirmation(?:\s*number)?|booking(?:\s*id)?)[:：]?\s*[A-Z0-9-]{4,}\b/gi,
  /\b(?:部屋|客室|room)\s*(?:番号|no\.?)?[:：]?\s*[A-Z0-9-]{2,}\b/gi,
  /(?:\+?\d[\d\s().-]{8,}\d)/g,
];

function parseMemo(value: string | null | undefined): MemoRecord {
  if (!value) return { text: '' };
  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'object' && parsed !== null && typeof parsed.text === 'string') {
      return { text: '', ...parsed };
    }
  } catch {
    return { text: value };
  }
  return { text: '' };
}

function redactSensitiveText(value: string | null | undefined): string {
  if (!value) return '';
  return SENSITIVE_PATTERNS.reduce((text, pattern) => text.replace(pattern, '[非公開]'), value).trim();
}

function safeUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export function detectAffiliateProvider(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes('jalan.net')) return 'jalan';
  if (hostname.includes('travel.rakuten') || hostname.includes('rakuten.co.jp')) return 'rakuten_travel';
  if (hostname.includes('ikyu.com')) return 'ikyu';
  if (hostname.includes('booking.com')) return 'booking';
  if (hostname.includes('agoda.com')) return 'agoda';
  return 'default';
}

function applyTemplate(template: string, url: string): string {
  const encoded = encodeURIComponent(url);
  return template.replaceAll('{url}', url).replaceAll('{encodedUrl}', encoded);
}

export function buildAffiliateUrl(rawUrl: string | undefined, env?: Partial<Env>): { url?: string; provider?: string } {
  const url = safeUrl(rawUrl);
  if (!url) return {};

  const provider = detectAffiliateProvider(url);
  const templateMap: Record<string, string | undefined> = {
    jalan: env?.AFFILIATE_TEMPLATE_JALAN,
    rakuten_travel: env?.AFFILIATE_TEMPLATE_RAKUTEN_TRAVEL,
    ikyu: env?.AFFILIATE_TEMPLATE_IKYU,
    booking: env?.AFFILIATE_TEMPLATE_BOOKING,
    agoda: env?.AFFILIATE_TEMPLATE_AGODA,
    default: env?.AFFILIATE_TEMPLATE_DEFAULT,
  };

  const template = templateMap[provider] ?? templateMap.default;
  if (template) {
    return { url: applyTemplate(template, url), provider };
  }

  const fallback = new URL(url);
  fallback.searchParams.set('utm_source', 'tabitabi');
  fallback.searchParams.set('utm_medium', 'affiliate_card');
  fallback.searchParams.set('utm_campaign', 'public_itinerary');
  return { url: fallback.toString(), provider };
}

export function createPublicStepSnapshot(row: Record<string, unknown>, env?: Partial<Env>) {
  const notes = parseMemo(row.notes as string | null | undefined);
  const bookingUrl = safeUrl(notes.booking_url);
  const affiliate = buildAffiliateUrl(bookingUrl, env);
  const publicNotes: MemoRecord = {
    text: redactSensitiveText(notes.public_text || notes.text),
  };

  if (bookingUrl) {
    publicNotes.booking_url = bookingUrl;
    publicNotes.affiliate_url = affiliate.url ?? bookingUrl;
    publicNotes.affiliate_provider = affiliate.provider ?? detectAffiliateProvider(bookingUrl);
    publicNotes.affiliate_disclosure = AFFILIATE_DISCLOSURE;
  }

  const title = redactSensitiveText(notes.public_title || (row.title as string));
  const location = redactSensitiveText(notes.public_location || (row.location as string | null | undefined));

  return {
    title: title || '旅の予定',
    start_at: row.start_at,
    end_at: row.end_at,
    location: location || null,
    notes: JSON.stringify(publicNotes),
    type: (row.type as Step['type']) ?? STEP_TYPE.NORMAL_GENERAL,
    is_all_day: row.is_all_day,
  };
}

export function createPublicMemoSnapshot(memo: string | null | undefined): string {
  const parsed = parseMemo(memo);
  return JSON.stringify({
    text: redactSensitiveText(parsed.public_text || parsed.text),
    affiliate_disclosure: AFFILIATE_DISCLOSURE,
  });
}
