<script lang="ts">
  import { onMount } from "svelte";
  import { itineraryApi } from "$lib/api/itinerary";
  import type { Itinerary } from "@tabitabi/types";

  let itineraries: Itinerary[] = $state([]);
  let loading = $state(true);

  onMount(async () => {
    await loadItineraries();
  });

  async function loadItineraries() {
    try {
      loading = true;
      itineraries = await itineraryApi.list();
    } catch (error) {
      console.error("Failed to load itineraries:", error);
    } finally {
      loading = false;
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP");
  }
</script>

<svelte:head>
  <title>しおり一覧 - Tabitabi</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-6xl mx-auto px-4 py-8">
    <div class="flex justify-between items-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900">しおり一覧</h1>
      <a
        href="/"
        class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
      >
        新規作成
      </a>
    </div>

    {#if loading}
      <div class="text-center py-12">
        <p class="text-gray-500">読み込み中...</p>
      </div>
    {:else if itineraries.length === 0}
      <div class="text-center py-12">
        <p class="text-gray-500 mb-4">まだしおりがありません</p>
        <p class="text-gray-400 text-sm">
          トップページから最初のしおりを作成しましょう
        </p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each itineraries as itinerary}
          <a
            href="/{itinerary.id}"
            class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 block"
          >
            <h3 class="text-xl font-semibold text-gray-900 mb-2">
              {itinerary.title}
            </h3>
            <p class="text-gray-600 text-sm mb-4">
              作成日: {formatDate(itinerary.created_at)}
            </p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {itinerary.theme_id === "minimal" ? "ミニマル" : "スタンダード"}
              </span>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
