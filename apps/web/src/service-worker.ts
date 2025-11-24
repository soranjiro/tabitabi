/// <reference lib="webworker" />

import { build, files, version } from "$service-worker";

const worker = self as unknown as ServiceWorkerGlobalScope;
const CACHE_NAME = `tabitabi-cache-${version}`;
const ASSETS = [
  ...build,
  ...files,
];

worker.addEventListener("install", (event: ExtendableEvent) => {
  // Create a new cache and add all files to it
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

    // ASSETS: Cache-First
    // If the request is for an asset (build files or static files), serve from cache
    if (ASSETS.includes(url.pathname)) {
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) return cachedResponse;
    }

    // DATA & NAVIGATION: Network-First
    // For everything else (HTML pages, API data), try the network first
    try {
      const response = await fetch(event.request);

      // If successful, clone and cache for offline use later
      if (response.status === 200) {
        cache.put(event.request, response.clone());
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
