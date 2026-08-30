import { parseMemoData } from "$lib/memo";
import type { Step, StepType } from "@tabitabi/types";
import { STEP_TYPE } from "@tabitabi/types";

export type BookingCard = {
  linkUrl: string;
  actionUrl: string;
  provider: string;
  providerLabel: string;
  label: string;
  disclosure?: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  jalan: "じゃらんで見る",
  rakuten_travel: "楽天トラベルで見る",
  ikyu: "一休で見る",
  booking: "Booking.comで見る",
  agoda: "Agodaで見る",
  tabelog: "食べログで見る",
  gnavi: "ぐるなびで見る",
  hotpepper: "ホットペッパーで見る",
  asoview: "アソビューで見る",
  klook: "Klookで見る",
  rakuten_market: "楽天市場で見る",
  yahoo_shopping: "Yahoo!ショッピングで見る",
  default: "予約サイトで見る",
};

const TYPE_LABELS: Partial<Record<StepType, string>> = {
  [STEP_TYPE.NORMAL_HOTEL]: "予約サイト",
  [STEP_TYPE.NORMAL_FOOD]: "店舗リンク",
  [STEP_TYPE.NORMAL_MEAL]: "店舗リンク",
  [STEP_TYPE.NORMAL_SIGHTSEEING]: "観光リンク",
  [STEP_TYPE.NORMAL_SHOPPING]: "買い物リンク",
};

function detectProvider(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("jalan.net")) return "jalan";
  if (hostname.includes("travel.rakuten")) return "rakuten_travel";
  if (hostname.includes("ikyu.com")) return "ikyu";
  if (hostname.includes("booking.com")) return "booking";
  if (hostname.includes("agoda.com")) return "agoda";
  if (hostname.includes("tabelog.com")) return "tabelog";
  if (hostname.includes("gnavi.co.jp")) return "gnavi";
  if (hostname.includes("hotpepper.jp")) return "hotpepper";
  if (hostname.includes("asoview.com")) return "asoview";
  if (hostname.includes("klook.com")) return "klook";
  if (hostname.includes("rakuten.co.jp")) return "rakuten_market";
  if (hostname.includes("shopping.yahoo.co.jp")) return "yahoo_shopping";
  return "default";
}

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function getBookingCard(
  stepOrNotes: Step | string | null | undefined,
): BookingCard | null {
  const step = typeof stepOrNotes === "object" && stepOrNotes !== null
    ? stepOrNotes
    : null;
  const notes: string | null | undefined = step
    ? step.notes
    : typeof stepOrNotes === "string"
      ? stepOrNotes
      : null;
  const data = parseMemoData(notes);
  const linkUrl = safeUrl(step?.link) ?? safeUrl(data.booking_url);
  if (!linkUrl) return null;

  const affiliateUrl = safeUrl(data.affiliate_url) ?? linkUrl;
  const provider = typeof data.affiliate_provider === "string"
    ? data.affiliate_provider
    : detectProvider(linkUrl);

  return {
    linkUrl,
    actionUrl: affiliateUrl,
    provider,
    providerLabel: PROVIDER_LABELS[provider] ?? PROVIDER_LABELS.default,
    label: step?.type ? TYPE_LABELS[step.type] ?? "リンク" : "リンク",
    disclosure:
      typeof data.affiliate_disclosure === "string"
        ? data.affiliate_disclosure
        : undefined,
  };
}
