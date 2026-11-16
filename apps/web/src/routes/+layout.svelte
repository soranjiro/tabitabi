<script lang="ts">
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { prepareExternalAnchor } from "$lib/external-links";
  import "../app.css";
  const pathname = $derived(page.url.pathname);

  // Keep tabitabi open while following normal external links.
  // Native anchor navigation remains responsible for opening the new tab.
  onMount(() => {
    const handleExternalLinkClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented || event.button !== 0 ||
        event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
      ) return;
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a[href]");
      if (anchor instanceof HTMLAnchorElement) {
        prepareExternalAnchor(anchor, window.location.href);
      }
    };

    document.addEventListener("click", handleExternalLinkClick, { capture: true });
    return () => document.removeEventListener("click", handleExternalLinkClick, { capture: true });
  });

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
