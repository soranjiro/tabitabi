<script lang="ts">
  import { onMount } from "svelte";
  import { userApi } from "$lib/api/user";
  import type { PublicFeedItem } from "@tabitabi/types";

  let items: PublicFeedItem[] = $state([]);
  let loading = $state(true);
  let loadingMore = $state(false);
  let hasMore = $state(false);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const result = await userApi.getPublicFeed(0);
      items = result.items;
      hasMore = result.hasMore;
    } catch {
      error = "読み込みに失敗しました";
    } finally {
      loading = false;
    }
  });

  async function loadMore() {
    loadingMore = true;
    try {
      const result = await userApi.getPublicFeed(items.length);
      items = [...items, ...result.items];
      hasMore = result.hasMore;
    } catch {
      error = "読み込みに失敗しました";
    } finally {
      loadingMore = false;
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ja-JP");
  }
</script>

<svelte:head>
  <title>みんなのしおり - Tabitabi</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-3xl mx-auto px-4 py-8">

    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">みんなのしおり</h1>
      <p class="text-sm text-gray-500 mt-1">公開されているしおりの一覧</p>
    </div>

    {#if loading}
      <p class="text-gray-500 text-center py-12">読み込み中...</p>
    {:else if error}
      <p class="text-red-500 text-center py-12">{error}</p>
    {:else if items.length === 0}
      <p class="text-gray-400 text-center py-12">まだ公開されているしおりはありません</p>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {#each items as item}
          <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
            <a href="/{item.itinerary_id}" class="block">
              <h3 class="font-medium text-gray-900 truncate">{item.title}</h3>
            </a>
            <div class="flex items-center justify-between mt-2">
              <a href="/users/{item.username}" class="text-xs text-indigo-600 hover:underline">
                @{item.username}
              </a>
              <p class="text-xs text-gray-400">{formatDate(item.created_at)}</p>
            </div>
          </div>
        {/each}
      </div>

      {#if hasMore}
        <div class="mt-8 text-center">
          <button
            onclick={loadMore}
            disabled={loadingMore}
            class="px-6 py-2 rounded-md border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {loadingMore ? "読み込み中..." : "さらに読み込む"}
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>
