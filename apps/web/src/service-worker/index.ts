/// <reference lib="webworker" />

import { immutable } from "$app/manifest";
import { version } from "$app/env";
import { mayCacheOffline } from "$lib/offline-cache-policy";

const worker = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = `tabitabi-cache-${version}`;
const BUILD_ASSETS = new Set(immutable.map(({ path }) => `/${path}`));

worker.addEventListener("install", () => {
  // Cache immutable bundles on demand instead of delaying the first page.
  worker.skipWaiting();
});

worker.addEventListener("activate", (event: ExtendableEvent) => {
  async function deleteOldCaches() {
    // Also evicts private HTML/API entries that older SW versions cached.
    for (const key of await caches.keys()) {
      if (key !== CACHE_NAME) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
  event.waitUntil(worker.clients.claim());
});

worker.addEventListener("fetch", (event: FetchEvent) => {
  // Personal pages, navigations, API responses and authenticated requests
  // must never be persisted across account changes or logout.
  if (!mayCacheOffline(event.request, worker.location.origin, BUILD_ASSETS)) return;

  async function respond(): Promise<Response> {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE_NAME);
    const immutable = BUILD_ASSETS.has(url.pathname);

    if (immutable) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
    }

    try {
      const response = await fetch(event.request);
      const cacheControl = response.headers.get("Cache-Control") || "";
      if (response.status === 200 && !/(?:^|,)\s*(?:private|no-store)(?:\s|,|$)/i.test(cacheControl)
        && response.headers.get("Vary") !== "*") {
        try {
          await cache.put(event.request, response.clone());
        } catch (e) {
          console.warn("Failed to cache public asset:", event.request.url, e);
        }
      }
      return response;
    } catch {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      throw new Error("Offline and no cache available");
    }
  }

  event.respondWith(respond());
});
