import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { itineraryApi } from "$lib/api/itinerary";
import { stepApi } from "$lib/api/step";
import {
  DEFAULT_ITINERARY_COVER_IMAGE,
  formatItineraryDateRange,
  resolveItineraryCoverImage,
  splitOgTitle,
} from "$lib/itinerary-cover";

const WIDTH = 1200;
const HEIGHT = 630;
const VERSIONED_CACHE_CONTROL =
  "public, max-age=31536000, s-maxage=31536000, immutable";
const SHORT_CACHE_CONTROL =
  "public, max-age=300, s-maxage=300, stale-while-revalidate=600";

const STATIC_ASSET_BASE =
  "https://raw.githubusercontent.com/soranjiro/tabitabi/main/apps/web/static";
const LOGO_URL = `${STATIC_ASSET_BASE}/icons/icon-512.png`;
const FONT_URL =
  "https://cdn.jsdelivr.net/gh/fontsource/font-files@c3f4e3e5a664d2c3002e800050ce809a790d7281/fonts/google/noto-sans-jp/files/noto-sans-jp-japanese-700-normal.woff2";

type CfImageDraw =
  | {
      text: string;
      font: { url: string };
      color: string;
      size: number;
      left?: number;
      right?: number;
      top?: number;
      bottom?: number;
    }
  | {
      url: string;
      width: number;
      height: number;
      fit: "contain";
      left?: number;
      right?: number;
      top?: number;
      bottom?: number;
      opacity?: number;
    };

type CfImageRequestInit = RequestInit & {
  cf: {
    image: {
      width: number;
      height: number;
      fit: "cover";
      gravity: "center";
      format: "jpeg";
      quality: number;
      brightness: number;
      contrast: number;
      metadata: "none";
      draw: CfImageDraw[];
    };
  };
};

type CloudflarePlatform = {
  context?: {
    waitUntil(promise: Promise<unknown>): void;
  };
};

function getEdgeCache(): Cache | null {
  if (typeof caches === "undefined") return null;
  return ((caches as CacheStorage & { default?: Cache }).default ?? null);
}

function staticAssetUrl(path: string): string {
  const safePath =
    path.startsWith("/") && !path.includes("..")
      ? path
      : DEFAULT_ITINERARY_COVER_IMAGE;
  return `${STATIC_ASSET_BASE}${safePath}`;
}

function isCacheableVersion(value: string | null): boolean {
  return value !== null && /^[a-z0-9]{1,32}$/i.test(value);
}

async function fallbackOgImage(
  eventFetch: typeof fetch,
  requestUrl: URL,
): Promise<Response> {
  const fallback = await eventFetch(new URL("/og-image.png", requestUrl));
  const headers = new Headers(fallback.headers);
  headers.set("Cache-Control", SHORT_CACHE_CONTROL);
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(fallback.body, {
    status: fallback.status,
    headers,
  });
}

export const GET: RequestHandler = async ({
  params,
  url,
  platform,
  fetch: eventFetch,
}) => {
  const versioned = isCacheableVersion(url.searchParams.get("v"));
  const edgeCache = versioned ? getEdgeCache() : null;
  const cacheKey = new Request(url.toString(), { method: "GET" });

  if (edgeCache) {
    const cached = await edgeCache.match(cacheKey);
    if (cached) return cached;
  }

  let itinerary;
  let steps;
  try {
    [itinerary, steps] = await Promise.all([
      itineraryApi.get(params.id),
      stepApi.list(params.id),
    ]);
  } catch {
    throw error(404, "しおりが見つかりません");
  }

  const titleLines = splitOgTitle(itinerary.title);
  const dateLabel = formatItineraryDateRange(steps);
  const backgroundPath = resolveItineraryCoverImage(itinerary);
  const draw: CfImageDraw[] = [];

  if (dateLabel) {
    draw.push({
      text: dateLabel,
      font: { url: FONT_URL },
      color: "#ffffff",
      size: 30,
      left: 72,
      bottom: 58,
    });
  }

  const titleSize = titleLines.length > 1 ? 62 : 70;
  const titleBottom = dateLabel ? 116 : 78;
  const lineGap = titleSize + 18;

  titleLines
    .slice()
    .reverse()
    .forEach((line, index) => {
      draw.push({
        text: line,
        font: { url: FONT_URL },
        color: "#ffffff",
        size: titleSize,
        left: 72,
        bottom: titleBottom + index * lineGap,
      });
    });

  draw.push(
    {
      text: "たびたび",
      font: { url: FONT_URL },
      color: "#ffffff",
      size: 29,
      right: 128,
      bottom: 52,
    },
    {
      url: LOGO_URL,
      width: 64,
      height: 64,
      fit: "contain",
      right: 48,
      bottom: 42,
      opacity: 0.96,
    },
  );

  const transformed = await fetch(staticAssetUrl(backgroundPath), {
    cf: {
      image: {
        width: WIDTH,
        height: HEIGHT,
        fit: "cover",
        gravity: "center",
        format: "jpeg",
        quality: 88,
        brightness: 0.56,
        contrast: 1.05,
        metadata: "none",
        draw,
      },
    },
  } as CfImageRequestInit);

  if (!transformed.ok) {
    return fallbackOgImage(eventFetch, url);
  }

  const headers = new Headers(transformed.headers);
  headers.set(
    "Cache-Control",
    versioned ? VERSIONED_CACHE_CONTROL : SHORT_CACHE_CONTROL,
  );
  headers.set("Content-Type", "image/jpeg");
  headers.set("Content-Disposition", 'inline; filename="itinerary-og.jpg"');
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cross-Origin-Resource-Policy", "cross-origin");

  const response = new Response(transformed.body, {
    status: 200,
    headers,
  });

  if (edgeCache) {
    const cacheWrite = edgeCache.put(cacheKey, response.clone());
    const context = (platform as CloudflarePlatform | undefined)?.context;
    if (context) context.waitUntil(cacheWrite);
    else await cacheWrite;
  }

  return response;
};
