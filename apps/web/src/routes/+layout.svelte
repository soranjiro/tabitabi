<script lang="ts">
  import { page } from "$app/stores";
  import "../app.css";
  import "./home/hero-refresh.css";
  import ExternalSiteOverlay from "$lib/external-site-overlay/ExternalSiteOverlay.svelte";

  function isIndexablePath(pathname: string) {
    if (pathname === "/" || pathname === "/explore") return true;
    if (pathname.startsWith("/area/")) return true;
    return false;
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
