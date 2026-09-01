<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { backgroundApi } from "$lib/api/background";
  import type { ItineraryResponse } from "@tabitabi/types";

  let current = $state<string | null>(null);
  let loadedId = $state<string | null>(null);

  const itinerary = $derived(($page.data?.itinerary ?? null) as ItineraryResponse | null);

  $effect(() => {
    const id = itinerary?.id;
    if (!id) {
      loadedId = null;
      current = null;
      return;
    }
    if (loadedId === id) return;
    loadedId = id;
    current = null;
    void loadBackground(id);
  });

  $effect(() => {
    if (typeof document === "undefined") return;
    if (itinerary?.id && current) {
      document.documentElement.dataset.itineraryCover = "true";
      document.documentElement.style.setProperty("--itinerary-cover-image", `url("${current}")`);
    } else {
      delete document.documentElement.dataset.itineraryCover;
      document.documentElement.style.removeProperty("--itinerary-cover-image");
    }
  });

  onMount(() => {
    const handleBackgroundChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ itineraryId: string; backgroundImage: string | null }>).detail;
      if (!detail || detail.itineraryId !== itinerary?.id) return;
      current = detail.backgroundImage;
    };
    window.addEventListener("tabitabi:background-changed", handleBackgroundChanged);
    return () => window.removeEventListener("tabitabi:background-changed", handleBackgroundChanged);
  });

  async function loadBackground(id: string) {
    try {
      current = (await backgroundApi.get(id)).background_image;
    } catch {
      current = null;
    }
  }
</script>
