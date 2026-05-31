import { parseMemoData } from "$lib/memo";

export type BookingCard = {
  bookingUrl: string;
  actionUrl: string;
  provider: string;
  providerLabel: string;
  disclosure?: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  jalan: "じゃらんで見る",
  rakuten_travel: "楽天トラベルで見る",
  ikyu: "一休で見る",
  booking: "Booking.comで見る",
  agoda: "Agodaで見る",
  default: "予約サイトで見る",
};

function detectProvider(url: string): string {
  const hostname = new URL(url).hostname.toLowerCase();
  if (hostname.includes("jalan.net")) return "jalan";
  if (hostname.includes("travel.rakuten") || hostname.includes("rakuten.co.jp"))
    return "rakuten_travel";
  if (hostname.includes("ikyu.com")) return "ikyu";
  if (hostname.includes("booking.com")) return "booking";
  if (hostname.includes("agoda.com")) return "agoda";
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

export function getBookingCard(notes: string | null | undefined): BookingCard | null {
  const data = parseMemoData(notes);
  const bookingUrl = safeUrl(data.booking_url);
  if (!bookingUrl) return null;

  const affiliateUrl = safeUrl(data.affiliate_url) ?? bookingUrl;
  const provider = typeof data.affiliate_provider === "string"
    ? data.affiliate_provider
    : detectProvider(bookingUrl);

  return {
    bookingUrl,
    actionUrl: affiliateUrl,
    provider,
    providerLabel: PROVIDER_LABELS[provider] ?? PROVIDER_LABELS.default,
    disclosure:
      typeof data.affiliate_disclosure === "string"
        ? data.affiliate_disclosure
        : undefined,
  };
}
