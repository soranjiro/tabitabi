<script lang="ts">
  import { page } from "$app/state";
  import "../app.css";
  const pathname = $derived(page.url.pathname);

  function isIndexablePath(pathname: string) {
    if (pathname === "/" || pathname === "/explore") return true;
    if (pathname.startsWith("/area/")) return true;
    return false;
  }
</script>

<svelte:head>
  <meta
    name="robots"
    content={isIndexablePath(pathname)
      ? "index, follow, max-image-preview:large"
      : "noindex, nofollow"}
  />
</svelte:head>

<main class="min-h-screen">
  <slot />
</main>
