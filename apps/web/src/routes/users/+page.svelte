<script lang="ts">
  import { onMount } from "svelte";
  import { userApi } from "$lib/api/user";
  import type { PublicFeedItem, UserSearchResult } from "@tabitabi/types";

  let items: PublicFeedItem[] = $state([]);
  let loading = $state(true);
  let loadingMore = $state(false);
  let hasMore = $state(false);
  let error = $state<string | null>(null);
  let loadMoreError = $state<string | null>(null);

  // Search
  let searchQuery = $state("");
  let searchResults = $state<UserSearchResult[] | null>(null);
  let searchLoading = $state(false);
  let searchTimer: ReturnType<typeof setTimeout> | null = null;

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
    loadMoreError = null;
    try {
      const result = await userApi.getPublicFeed(items.length);
      items = [...items, ...result.items];
      hasMore = result.hasMore;
    } catch {
      loadMoreError = "追加の読み込みに失敗しました";
    } finally {
      loadingMore = false;
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ja-JP");
  }

  function handleSearchInput() {
    if (searchTimer) clearTimeout(searchTimer);
    if (!searchQuery.trim()) {
      searchResults = null;
      return;
    }
    searchTimer = setTimeout(async () => {
      searchLoading = true;
      try {
        const result = await userApi.searchUsers(searchQuery.trim());
        searchResults = result.users;
      } finally {
        searchLoading = false;
      }
    }, 300);
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

    <div class="mb-6">
      <input
        type="search"
        placeholder="ユーザー名で検索..."
        bind:value={searchQuery}
        oninput={handleSearchInput}
        class="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
      />
      {#if searchQuery.trim()}
        <div class="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm">
          {#if searchLoading}
            <p class="text-gray-400 text-sm px-4 py-3">検索中...</p>
          {:else if searchResults !== null && searchResults.length === 0}
            <p class="text-gray-400 text-sm px-4 py-3">見つかりませんでした</p>
          {:else if searchResults !== null}
            {#each searchResults as user}
              <a
                href="/users/{user.username}"
                class="flex items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
              >
                <span class="text-sm font-medium text-indigo-600">@{user.username}</span>
              </a>
            {/each}
          {/if}
        </div>
      {/if}
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

      {#if loadMoreError}
        <p class="text-red-500 text-center mt-4 text-sm">{loadMoreError}</p>
      {/if}

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
