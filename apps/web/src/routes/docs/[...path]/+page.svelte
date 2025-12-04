<script lang="ts">
  import type { PageData } from "./$types";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  const { data }: { data: PageData } = $props();

  let iframeElement: HTMLIFrameElement;
  let isInitialized = false;

  function setupIframeClickListener() {
    if (!iframeElement?.contentWindow) return;

    const iframeDoc = iframeElement.contentWindow.document;
    iframeDoc.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");

      if (anchor && anchor.href) {
        const url = new URL(anchor.href);

        // Intercept all internal links (same origin)
        if (url.origin === window.location.origin) {
          e.preventDefault();
          // Remove .html extension if present
          let pathname = url.pathname;
          if (pathname.endsWith(".html")) {
            pathname = pathname.slice(0, -5);
          }
          // Navigate the parent window
          goto(pathname);
        }
      }
    });
  }

  function updateIframeContent() {
    if (!iframeElement?.contentWindow) return;

    iframeElement.contentWindow.document.open();
    iframeElement.contentWindow.document.write(data.htmlContent);
    iframeElement.contentWindow.document.close();

    // Re-setup click listener after content update
    setupIframeClickListener();
  }

  onMount(() => {
    // Check if the current URL has .html extension and redirect to clean URL
    if (window.location.pathname.endsWith(".html")) {
      const cleanPath = window.location.pathname.slice(0, -5);
      goto(cleanPath, { replaceState: true });
      return; // Don't load iframe content yet
    }

    isInitialized = true;
    updateIframeContent();
  });

  // Watch for data changes and update iframe content
  $effect(() => {
    if (isInitialized && data.htmlContent) {
      updateIframeContent();
    }
  });
</script>

<iframe
  bind:this={iframeElement}
  title="Documentation"
  style="width: 100%; height: 100vh; border: none; display: block; margin: 0; padding: 0;"
></iframe>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
</style>
