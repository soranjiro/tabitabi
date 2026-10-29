export function resolveSharedItineraryPath(value: string, origin: string): string | null {
  try {
    const urlObj = new URL(value.trim(), origin);

    if (urlObj.origin !== origin) {
      return null;
    }

    const pathname = urlObj.pathname.replace(/\/+$/, "");
    const isItinerary = /^\/itineraries\/[a-zA-Z0-9_-]+$/.test(pathname);
    const isShared = /^\/s\/[a-zA-Z0-9_-]+$/.test(pathname);

    if (!isItinerary && !isShared) {
      return null;
    }

    return pathname + urlObj.search + urlObj.hash;
  } catch {
    return null;
  }
}
