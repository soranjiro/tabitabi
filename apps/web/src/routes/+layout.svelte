<script lang="ts">
  import { page } from "$app/stores";
  import "../app.css";
  import ExternalSiteOverlay from "$lib/external-site-overlay/ExternalSiteOverlay.svelte";
</script>

<svelte:head>
  <meta
    name="robots"
    content={$page.url.pathname === "/" ? "index, follow, max-image-preview:large" : "noindex, nofollow"}
  />
</svelte:head>

<main class="min-h-screen">
  <slot />
</main>

<ExternalSiteOverlay />
