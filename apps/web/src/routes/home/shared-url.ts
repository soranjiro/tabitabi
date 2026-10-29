export function resolveSharedItineraryPath(value: string, origin: string): string | null {
  const input = value.trim();

  // A bare ID resolves to the editable itinerary URL. Public snapshots redirect to /s/:id.
  if (/^[a-zA-Z0-9_-]+$/.test(input)) {
    return `/itineraries/${input}`;
  }

  try {
    const urlObj = new URL(input, origin);

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
