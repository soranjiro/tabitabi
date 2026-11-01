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

// Check DNS label boundaries, not substrings (e.g. evil-jalan.net is not jalan.net).
function isHostOrSubdomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function detectProvider(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  if (isHostOrSubdomain(hostname, "jalan.net")) return "jalan";
  if (isHostOrSubdomain(hostname, "travel.rakuten.co.jp")) return "rakuten_travel";
  if (isHostOrSubdomain(hostname, "ikyu.com")) return "ikyu";
  if (isHostOrSubdomain(hostname, "booking.com")) return "booking";
  if (isHostOrSubdomain(hostname, "agoda.com")) return "agoda";
  if (isHostOrSubdomain(hostname, "tabelog.com")) return "tabelog";
  if (isHostOrSubdomain(hostname, "gnavi.co.jp")) return "gnavi";
  if (isHostOrSubdomain(hostname, "hotpepper.jp")) return "hotpepper";
  if (isHostOrSubdomain(hostname, "asoview.com")) return "asoview";
  if (isHostOrSubdomain(hostname, "klook.com")) return "klook";
  if (isHostOrSubdomain(hostname, "rakuten.co.jp")) return "rakuten_market";
  if (isHostOrSubdomain(hostname, "shopping.yahoo.co.jp")) return "yahoo_shopping";
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
  const linkUrl = safeUrl(step?.link);
  if (!linkUrl) return null;

  const provider = detectProvider(linkUrl);

  return {
    linkUrl,
    actionUrl: linkUrl,
    provider,
    providerLabel: PROVIDER_LABELS[provider] ?? PROVIDER_LABELS.default,
    label: step?.type ? TYPE_LABELS[step.type] ?? "リンク" : "リンク",
    disclosure: undefined,
  };
}
