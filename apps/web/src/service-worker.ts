/// <reference lib="webworker" />

import { build, version } from "$service-worker";

const worker = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = `tabitabi-cache-${version}`;
const BUILD_ASSETS = new Set(build);

worker.addEventListener("install", () => {
  // Do not precache the whole application bundle during first load. Fetching all
  // route chunks here competes with the hero image on constrained mobile links.
  // Versioned build assets are cached on first use instead.
  worker.skipWaiting();
});

worker.addEventListener("activate", (event: ExtendableEvent) => {
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE_NAME) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
  event.waitUntil(worker.clients.claim());
});

worker.addEventListener("fetch", (event: FetchEvent) => {
  if (event.request.method !== "GET") return;
  // External maps use their provider's HTTP cache policy, never our offline cache.
  if (new URL(event.request.url).origin !== worker.location.origin) return;

  async function respond() {
    const url = new URL(event.request.url);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return fetch(event.request);
    }

    const cache = await caches.open(CACHE_NAME);

    // Hashed application assets are immutable for this build. Serve a previously
    // visited asset from cache, otherwise fetch it once and cache that response.
    if (BUILD_ASSETS.has(url.pathname)) {
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;

      const response = await fetch(event.request);
      if (response.status === 200) {
        try {
          await cache.put(event.request, response.clone());
        } catch (e) {
          console.warn("Failed to cache build asset:", event.request.url, e);
        }
      }
      return response;
    }

    // Navigation, API data and static assets stay network-first. Resources that
    // have actually been used remain available as an offline fallback.
    try {
      const response = await fetch(event.request);

      if (response.status === 200) {
        try {
          await cache.put(event.request, response.clone());
        } catch (e) {
          console.warn("Failed to cache request:", event.request.url, e);
        }
      }

      return response;
    } catch {
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;

      throw new Error("Offline and no cache available");
    }
  }

  event.respondWith(respond());
});
