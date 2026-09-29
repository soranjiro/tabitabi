import type { D1Database } from "@cloudflare/workers-types";
import type { RequestHandler } from "./$types";
import {
  DEFAULT_ITINERARY_COVER_IMAGE,
  ITINERARY_THEME_COVER_IMAGES,
  formatItineraryDateRange,
  resolveItineraryCoverImage,
} from "$lib/itinerary/cover";
import {
  createItineraryOgSvg,
  loadOgFontBuffers,
} from "$lib/server/og/itinerary-card";
import {
  bytesToDataUri,
  rasterResponseToDataUri,
  renderSvgToPng,
  type OgWasmAssets,
} from "$lib/server/og/render";

interface ItineraryOgRow {
  title: string;
  theme_id: string;
  background_image: string | null;
}

interface ItineraryRangeRow {
  start_at: number | null;
  end_at: number | null;
}

interface OgPlatformEnv {
  DB: D1Database;
  RESVG_WASM?: WebAssembly.Module;
  AVIF_DEC_WASM?: WebAssembly.Module;
  WEBP_DEC_WASM?: WebAssembly.Module;
}

interface OgPlatform {
  env: OgPlatformEnv;
  caches?: {
    default: Cache;
  };
}

function localAssetPath(value: string): string | null {
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function backgroundCandidates(row: ItineraryOgRow): string[] {
  const selected = localAssetPath(resolveItineraryCoverImage(row.background_image, row.theme_id));
  const theme = localAssetPath(
    ITINERARY_THEME_COVER_IMAGES[row.theme_id] ?? DEFAULT_ITINERARY_COVER_IMAGE,
  );
  return [...new Set([selected, theme, DEFAULT_ITINERARY_COVER_IMAGE].filter(Boolean) as string[])];
}

async function fetchBackgroundDataUri(
  request: Request,
  row: ItineraryOgRow,
  assets: OgWasmAssets,
): Promise<string> {
  let lastError: unknown;
  for (const path of backgroundCandidates(row)) {
    try {
      const response = await fetch(new URL(path, request.url));
      return await rasterResponseToDataUri(response, path, assets);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("No itinerary cover background could be loaded");
}

async function staticFallback(request: Request): Promise<Response> {
  const response = await fetch(new URL("/og-image.png", request.url));
  if (!response.ok) return new Response("OG image generation failed", { status: 500 });
  return new Response(response.body, {
    status: 200,
    headers: {
      "content-type": response.headers.get("content-type") ?? "image/png",
      "cache-control": "public, max-age=300, s-maxage=3600",
    },
  });
}

export const GET: RequestHandler = async ({ params, platform, request, url }) => {
  const cfPlatform = platform as OgPlatform | undefined;
  const env = cfPlatform?.env;
  const versioned = url.searchParams.has("v");
  const edgeCache = versioned ? cfPlatform?.caches?.default : undefined;
  if (edgeCache) {
    const cached = await edgeCache.match(request);
    if (cached) return cached;
  }

  if (!env?.DB) return staticFallback(request);

  const [itinerary, range] = await Promise.all([
    env.DB.prepare(
      "SELECT title, theme_id, background_image FROM itineraries WHERE id = ?",
    )
      .bind(params.id)
      .first<ItineraryOgRow>(),
    env.DB.prepare(
      `SELECT
        MIN(scheduled_start_at) AS start_at,
        MAX(scheduled_end_at) AS end_at
       FROM steps
       WHERE itinerary_id = ?`,
    )
      .bind(params.id)
      .first<ItineraryRangeRow>(),
  ]);

  if (!itinerary) return new Response("Not found", { status: 404 });

  if (!env.RESVG_WASM || !env.AVIF_DEC_WASM || !env.WEBP_DEC_WASM) {
    return staticFallback(request);
  }

  const assets: OgWasmAssets = {
    resvg: env.RESVG_WASM,
    avif: env.AVIF_DEC_WASM,
    webp: env.WEBP_DEC_WASM,
  };

  try {
    const dateLabel = formatItineraryDateRange(
      range?.start_at != null && range?.end_at != null
        ? { startAt: Number(range.start_at), endAt: Number(range.end_at) }
        : null,
    );

    const [backgroundDataUri, iconResponse, fontBuffers] = await Promise.all([
      fetchBackgroundDataUri(request, itinerary, assets),
      fetch(new URL("/icons/icon-192.png", request.url)),
      loadOgFontBuffers(`${itinerary.title}${dateLabel}`),
    ]);

    if (!iconResponse.ok) throw new Error(`OG icon fetch failed: ${iconResponse.status}`);
    const iconDataUri = bytesToDataUri(
      new Uint8Array(await iconResponse.arrayBuffer()),
      iconResponse.headers.get("content-type") ?? "image/png",
    );

    const png = await renderSvgToPng(
      createItineraryOgSvg({
        backgroundDataUri,
        iconDataUri,
        title: itinerary.title,
        dateLabel,
      }),
      fontBuffers,
      assets,
    );

    const response = new Response(png, {
      headers: {
        "content-type": "image/png",
        "content-length": String(png.byteLength),
        "cache-control": versioned
          ? "public, max-age=31536000, s-maxage=31536000, immutable"
          : "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
    if (edgeCache) await edgeCache.put(request, response.clone());
    return response;
  } catch (error) {
    console.error("Failed to render itinerary OG image", error);
    return staticFallback(request);
  }
};
