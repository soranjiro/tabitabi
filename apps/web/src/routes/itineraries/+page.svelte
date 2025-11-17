<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { itineraryApi } from "$lib/api/itinerary";
  import type { Itinerary } from "@tabitabi/types";

  let itineraries: Itinerary[] = $state([]);
  let loading = $state(true);
  let showCreateForm = $state(false);
  let newItinerary = $state({
    title: "",
    startDate: "",
    endDate: "",
    themeId: "standard",
  });

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

  async function createItinerary() {
    try {
      const created = await itineraryApi.create(newItinerary);
      goto(`/itineraries/${created.id}`);
    } catch (error) {
      console.error("Failed to create itinerary:", error);
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
      <button
        onclick={() => (showCreateForm = !showCreateForm)}
        class="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
      >
        新規作成
      </button>
    </div>

    {#if showCreateForm}
      <div class="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 class="text-xl font-semibold mb-4">新しいしおりを作成</h2>
        <div class="space-y-4">
          <div>
            <label for="itinerary-title" class="block text-sm font-medium text-gray-700 mb-1">
              タイトル
            </label>
            <input
              id="itinerary-title"
              type="text"
              bind:value={newItinerary.title}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              placeholder="例: 沖縄旅行"
            />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="itinerary-startDate" class="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                id="itinerary-startDate"
                type="date"
                bind:value={newItinerary.startDate}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label for="itinerary-endDate" class="block text-sm font-medium text-gray-700 mb-1">
                終了日
              </label>
              <input
                id="itinerary-endDate"
                type="date"
                bind:value={newItinerary.endDate}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div>
            <label for="itinerary-theme" class="block text-sm font-medium text-gray-700 mb-1">
              テーマ
            </label>
            <select
              id="itinerary-theme"
              bind:value={newItinerary.themeId}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="minimal">ミニマル</option>
              <option value="standard">スタンダード</option>
            </select>
          </div>
          <div class="flex gap-2">
            <button
              onclick={createItinerary}
              class="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
            >
              作成
            </button>
            <button
              onclick={() => (showCreateForm = false)}
              class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md transition-colors"
            >
              キャンセル
            </button>
          </div>
        </div>
      </div>
    {/if}

    {#if loading}
      <div class="text-center py-12">
        <p class="text-gray-500">読み込み中...</p>
      </div>
    {:else if itineraries.length === 0}
      <div class="text-center py-12">
        <p class="text-gray-500 mb-4">まだしおりがありません</p>
        <p class="text-gray-400 text-sm">
          「新規作成」ボタンから最初のしおりを作成しましょう
        </p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each itineraries as itinerary}
          <a
            href="/itineraries/{itinerary.id}"
            class="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 block"
          >
            <h3 class="text-xl font-semibold text-gray-900 mb-2">
              {itinerary.title}
            </h3>
            <p class="text-gray-600 text-sm mb-4">
              {formatDate(itinerary.startDate)} 〜 {formatDate(
                itinerary.endDate,
              )}
            </p>
            <div class="flex items-center justify-between">
              <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {itinerary.themeId === "minimal" ? "ミニマル" : "スタンダード"}
              </span>
            </div>
          </a>
        {/each}
      </div>
    {/if}
  </div>
</div>
