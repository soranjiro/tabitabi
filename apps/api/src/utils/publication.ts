import type { Step } from '@tabitabi/types';
import { STEP_TYPE } from '@tabitabi/types';
import type { Env } from './index';

type MemoRecord = {
  text: string;
  booking_url?: string;
  affiliate_url?: string;
  affiliate_provider?: string;
  affiliate_disclosure?: string;
  [key: string]: unknown;
};

export const AFFILIATE_DISCLOSURE = 'このページにはアフィリエイトリンクが含まれます。';

const SENSITIVE_PATTERNS: RegExp[] = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /(?:予約番号|予約No\.?|confirmation(?:\s*number)?|booking(?:\s*id)?)[:：]?\s*[A-Z0-9-]{4,}\b/gi,
  /(?:部屋|客室|room)\s*(?:番号|no\.?)?[:：]?\s*[A-Z0-9-]{2,}\b/gi,
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
  if (hostname.includes('travel.rakuten')) return 'rakuten_travel';
  if (hostname.includes('ikyu.com')) return 'ikyu';
  if (hostname.includes('booking.com')) return 'booking';
  if (hostname.includes('agoda.com')) return 'agoda';
  if (hostname.includes('tabelog.com')) return 'tabelog';
  if (hostname.includes('gnavi.co.jp')) return 'gnavi';
  if (hostname.includes('hotpepper.jp')) return 'hotpepper';
  if (hostname.includes('asoview.com')) return 'asoview';
  if (hostname.includes('klook.com')) return 'klook';
  if (hostname.includes('rakuten.co.jp')) return 'rakuten_market';
  if (hostname.includes('shopping.yahoo.co.jp')) return 'yahoo_shopping';
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
    tabelog: env?.AFFILIATE_TEMPLATE_TABELOG,
    gnavi: env?.AFFILIATE_TEMPLATE_GNAVI,
    hotpepper: env?.AFFILIATE_TEMPLATE_HOTPEPPER,
    asoview: env?.AFFILIATE_TEMPLATE_ASOVIEW,
    klook: env?.AFFILIATE_TEMPLATE_KLOOK,
    rakuten_market: env?.AFFILIATE_TEMPLATE_RAKUTEN_MARKET,
    yahoo_shopping: env?.AFFILIATE_TEMPLATE_YAHOO_SHOPPING,
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
  const sourceLink = safeUrl(row.link) ?? safeUrl(notes.booking_url);
  const affiliate = buildAffiliateUrl(sourceLink, env);
  const publicNotes: MemoRecord = {
    text: redactSensitiveText(notes.text),
  };

  if (sourceLink) {
    publicNotes.booking_url = sourceLink;
    publicNotes.affiliate_url = affiliate.url ?? sourceLink;
    publicNotes.affiliate_provider = affiliate.provider ?? detectAffiliateProvider(sourceLink);
    publicNotes.affiliate_disclosure = AFFILIATE_DISCLOSURE;
  }

  const title = redactSensitiveText(row.title as string);
  const location = redactSensitiveText(row.location as string | null | undefined);

  return {
    title: title || '旅の予定',
    start_at: row.start_at,
    end_at: row.end_at,
    location: location || null,
    notes: JSON.stringify(publicNotes),
    link: sourceLink ?? null,
    type: (row.type as Step['type']) ?? STEP_TYPE.NORMAL_GENERAL,
    is_all_day: row.is_all_day,
  };
}

export function createPublicMemoSnapshot(memo: string | null | undefined): string {
  const parsed = parseMemo(memo);
  return JSON.stringify({
    text: redactSensitiveText(parsed.text),
    affiliate_disclosure: AFFILIATE_DISCLOSURE,
  });
}
