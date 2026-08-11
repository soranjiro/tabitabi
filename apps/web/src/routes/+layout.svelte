<script lang="ts">
  import { page } from "$app/stores";
  import "../app.css";
  import ExternalSiteOverlay from "$lib/external-site-overlay/ExternalSiteOverlay.svelte";

  const publicItineraryIds = new Set([
    "kyoto-weekend",
    "hokkaido-summer",
    "setouchi-art",
    "fukuoka-food",
    "kamakura-coast",
    "nagano-books",
    "kyoto-garden",
    "kyoto-craft",
    "kyoto-night",
    "kyoto-family",
  ]);

  function isIndexablePath(pathname: string) {
    if (pathname === "/" || pathname === "/explore") return true;
    if (pathname.startsWith("/area/")) return true;
    const match = pathname.match(/^\/itineraries\/([^/]+)$/);
    return match ? publicItineraryIds.has(match[1]) : false;
  }
</script>

<svelte:head>
  <meta
    name="robots"
    content={isIndexablePath($page.url.pathname)
      ? "index, follow, max-image-preview:large"
      : "noindex, nofollow"}
  />
</svelte:head>

<main class="min-h-screen">
  <slot />
</main>

<ExternalSiteOverlay />
