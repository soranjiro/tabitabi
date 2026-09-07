/// <reference lib="webworker" />

import { build, version } from "$service-worker";

const worker = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = `tabitabi-cache-${version}`;
// Precache only versioned build assets. Static assets (hero images, OG images, etc.)
// are cached on demand so first-load bandwidth stays focused on the current page.
const ASSETS = [...build];

worker.addEventListener("install", (event: ExtendableEvent) => {
  // Create a new cache and add the application build assets to it.
  async function addFilesToCache() {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS);
  }

  event.waitUntil(addFilesToCache());
  // Force the waiting service worker to become the active service worker.
  worker.skipWaiting();
});

worker.addEventListener("activate", (event: ExtendableEvent) => {
  // Remove previous cached data from disk
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== CACHE_NAME) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
  // Tell the active service worker to take control of the page immediately.
  event.waitUntil(worker.clients.claim());
});

worker.addEventListener("fetch", (event: FetchEvent) => {
  // ignore POST requests etc
  if (event.request.method !== "GET") return;

  async function respond() {
    const url = new URL(event.request.url);
    const cache = await caches.open(CACHE_NAME);

    // Ignore non-http(s) schemes (extensions, chrome-extension://, etc.)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return fetch(event.request);
    }

    // BUILD ASSETS: Cache-First
    // Versioned application assets are safe to serve directly from the precache.
    if (ASSETS.includes(url.pathname)) {
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;
    }

    // STATIC, DATA & NAVIGATION: Network-First
    // Cache resources only after the page actually requests them. This avoids
    // downloading every static image during service-worker installation.
    try {
      const response = await fetch(event.request);

      // If successful, clone and cache for offline use later
      if (response.status === 200) {
        try {
          await cache.put(event.request, response.clone());
        } catch (e) {
          // Some requests may be unsupported by Cache API or otherwise fail to
          // be stored. Ignore caching failures.
          console.warn("Failed to cache request:", event.request.url, e);
        }
      }

      return response;
    } catch {
      // If network fails, fall back to cache
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;

      throw new Error("Offline and no cache available");
    }
  }

  event.respondWith(respond());
});
