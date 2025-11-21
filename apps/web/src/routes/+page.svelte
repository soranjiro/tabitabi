<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { itineraryApi } from "$lib/api/itinerary";
  import { getAvailableThemes } from "$lib/themes";
  import {
    getRecentItineraries,
    type RecentItinerary,
  } from "$lib/utils/recentItineraries";

  let title = $state("");
  let theme_id = $state("standard");
  let creating = $state(false);
  let recentItineraries = $state<RecentItinerary[]>([]);
  let showRecent = $state(false);

  const themes = getAvailableThemes();

  // Load recent itineraries with delay for performance
  onMount(() => {
    setTimeout(() => {
      recentItineraries = getRecentItineraries();
      showRecent = true;
    }, 300);
  });

  async function createItinerary() {
    if (!title.trim()) return;

    creating = true;
    try {
      const created = await itineraryApi.create({
        title: title.trim(),
        theme_id,
      });
      goto(`/${created.id}`);
    } catch (error) {
      console.error("Failed to create:", error);
      alert("しおりの作成に失敗しました");
    } finally {
      creating = false;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter" && !creating) {
      createItinerary();
    }
  }
</script>

<svelte:head>
  <title>Tabitabi - 旅のしおり</title>
</svelte:head>

<div
  class="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-indigo-100"
>
  <div class="text-center max-w-lg w-full">
    <h1 class="text-5xl font-bold text-indigo-600 mb-3">✈️ Tabitabi</h1>
    <p class="text-lg text-gray-600 mb-12">旅のしおりを、サクッと作成</p>

    <div class="bg-white rounded-2xl shadow-xl p-8">
      <input
        type="text"
        bind:value={title}
        onkeypress={handleKeyPress}
        placeholder="旅のタイトルを入力..."
        class="w-full text-xl px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors mb-4"
        disabled={creating}
      />

      <select
        bind:value={theme_id}
        class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors mb-4"
        disabled={creating}
      >
        {#each themes as theme}
          <option value={theme.id}>{theme.name} - {theme.description}</option>
        {/each}
      </select>

      <button
        onclick={createItinerary}
        disabled={!title.trim() || creating}
        class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-lg py-3 px-6 rounded-lg transition-colors"
      >
        {creating ? "作成中..." : "しおりを作成 →"}
      </button>

      <p class="text-sm text-gray-500 mt-6">
        URLが発行されます。仲間と共有しよう！
      </p>
      <div class="mt-6 pt-6 border-t border-gray-200">
        <button
          onclick={() => goto('/demo/fall')}
          class="w-full bg-orange-500/90 hover:bg-orange-600 text-white font-semibold text-base py-3 px-6 rounded-lg transition-colors"
          type="button"
        >🍁 Fallテーマの例を見る</button>
        <p class="text-xs text-gray-500 mt-2">サンプルしおりでレイアウトを確認できます</p>
      </div>
    </div>

    <!-- Recent Itineraries -->
    {#if showRecent && recentItineraries.length > 0}
      <div class="mt-8 bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">📚 最近の項目</h2>
        <div class="space-y-2">
          {#each recentItineraries as item}
            <button
              onclick={() => goto(`/${item.id}`)}
              class="w-full text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 border-2 border-transparent transition-all duration-200"
            >
              <div class="font-medium text-gray-800">{item.title}</div>
              <div class="text-xs text-gray-500 mt-1">
                {new Date(item.visitedAt).toLocaleDateString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.4s ease-out;
  }
</style>
