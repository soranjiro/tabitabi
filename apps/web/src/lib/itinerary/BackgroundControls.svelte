<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { backgroundApi } from "$lib/api/background";
  import type { ItineraryResponse } from "@tabitabi/types";

  let coverImage = $state<string | null>(null);
  let pageImage = $state<string | null>(null);
  let loadedId = $state<string | null>(null);

  const itinerary = $derived(($page.data?.itinerary ?? null) as ItineraryResponse | null);

  $effect(() => {
    const id = itinerary?.id;
    if (!id) {
      loadedId = null;
      coverImage = null;
      pageImage = null;
      return;
    }
    if (loadedId === id) return;
    loadedId = id;
    coverImage = null;
    pageImage = null;
    void loadBackground(id);
  });

  $effect(() => {
    if (typeof document === "undefined") return;
    if (itinerary?.id && coverImage) {
      document.documentElement.dataset.itineraryCover = "true";
      document.documentElement.style.setProperty("--itinerary-cover-image", `url("${coverImage}")`);
    } else {
      delete document.documentElement.dataset.itineraryCover;
      document.documentElement.style.removeProperty("--itinerary-cover-image");
    }
  });

  $effect(() => {
    if (typeof document === "undefined") return;
    if (itinerary?.id && pageImage) {
      document.documentElement.dataset.itineraryPageBackground = "true";
      document.documentElement.style.setProperty("--itinerary-page-background-image", `url("${pageImage}")`);
    } else {
      delete document.documentElement.dataset.itineraryPageBackground;
      document.documentElement.style.removeProperty("--itinerary-page-background-image");
    }
  });

  onMount(() => {
    const handleBackgroundChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ itineraryId: string; coverBackgroundImage: string | null; pageBackgroundImage: string | null }>).detail;
      if (!detail || detail.itineraryId !== itinerary?.id) return;
      coverImage = detail.coverBackgroundImage;
      pageImage = detail.pageBackgroundImage;
    };
    window.addEventListener("tabitabi:background-changed", handleBackgroundChanged);
    return () => window.removeEventListener("tabitabi:background-changed", handleBackgroundChanged);
  });

  async function loadBackground(id: string) {
    try {
      const settings = await backgroundApi.get(id);
      coverImage = settings.cover_background_image;
      pageImage = settings.page_background_image;
    } catch {
      coverImage = null;
      pageImage = null;
    }
  }
</script>
