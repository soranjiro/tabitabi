<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { backgroundApi } from "$lib/api/background";
  import type { ItineraryResponse } from "@tabitabi/types";

  let backgroundImage = $state<string | null>(null);
  let backgroundDisplay = $state<'cover' | 'page'>('cover');
  let loadedId = $state<string | null>(null);

  const itinerary = $derived(($page.data?.itinerary ?? null) as ItineraryResponse | null);

  $effect(() => {
    const id = itinerary?.id;
    if (!id) {
      loadedId = null;
      backgroundImage = null;
      return;
    }
    if (loadedId === id) return;
    loadedId = id;
    backgroundImage = null;
    void loadBackground(id);
  });

  $effect(() => {
    if (typeof document === "undefined") return;
    if (itinerary?.id && backgroundImage && backgroundDisplay === 'cover') {
      document.documentElement.dataset.itineraryCover = "true";
      document.documentElement.style.setProperty("--itinerary-cover-image", `url("${backgroundImage}")`);
    } else {
      delete document.documentElement.dataset.itineraryCover;
      document.documentElement.style.removeProperty("--itinerary-cover-image");
    }
  });

  $effect(() => {
    if (typeof document === "undefined") return;
    if (itinerary?.id && backgroundImage && backgroundDisplay === 'page') {
      document.documentElement.dataset.itineraryPageBackground = "true";
      document.documentElement.style.setProperty("--itinerary-page-background-image", `url("${backgroundImage}")`);
    } else {
      delete document.documentElement.dataset.itineraryPageBackground;
      document.documentElement.style.removeProperty("--itinerary-page-background-image");
    }
  });

  onMount(() => {
    const handleBackgroundChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ itineraryId: string; backgroundImage: string | null; backgroundDisplay: 'cover' | 'page' }>).detail;
      if (!detail || detail.itineraryId !== itinerary?.id) return;
      backgroundImage = detail.backgroundImage;
      backgroundDisplay = detail.backgroundDisplay;
    };
    window.addEventListener("tabitabi:background-changed", handleBackgroundChanged);
    return () => window.removeEventListener("tabitabi:background-changed", handleBackgroundChanged);
  });

  async function loadBackground(id: string) {
    try {
      const settings = await backgroundApi.get(id);
      backgroundImage = settings.background_image;
      backgroundDisplay = settings.background_display;
    } catch {
      backgroundImage = null;
    }
  }
</script>
