<script lang="ts">
  import { onMount, onDestroy } from "svelte";
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
  let searchError = $state<string | null>(null);
  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  let searchRequestId = 0;

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

  onDestroy(() => {
    if (searchTimer) clearTimeout(searchTimer);
  });

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ja-JP");
  }

  function handleSearchInput() {
    if (searchTimer) clearTimeout(searchTimer);
    searchError = null;
    if (!searchQuery.trim()) {
      searchResults = null;
      return;
    }
    searchTimer = setTimeout(async () => {
      const requestId = ++searchRequestId;
      searchLoading = true;
      try {
        const result = await userApi.searchUsers(searchQuery.trim());
        if (requestId === searchRequestId) {
          searchResults = result.users;
        }
      } catch {
        if (requestId === searchRequestId) {
          searchError = "検索に失敗しました";
        }
      } finally {
        if (requestId === searchRequestId) {
          searchLoading = false;
        }
      }
    }, 300);
  }
</script>

<svelte:head>
  <title>みんなのしおり - たびたび</title>
</svelte:head>

<div class="page-wrapper">
  <header class="page-header">
    <div class="header-inner">
      <a href="/" class="back-link">← たびたび</a>
      <h1 class="page-title">みんなのしおり</h1>
      <p class="page-subtitle">公開されているしおりの一覧</p>
    </div>
  </header>

  <div class="page-content">
    <div class="content-inner">

      <div class="mb-6">
        <input
          type="search"
          aria-label="ユーザー名で検索"
          placeholder="ユーザー名で検索..."
          bind:value={searchQuery}
          oninput={handleSearchInput}
          class="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
        />
        {#if searchQuery.trim()}
          <div class="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm">
            {#if searchLoading}
              <p class="text-gray-400 text-sm px-4 py-3">検索中...</p>
            {:else if searchError}
              <p class="text-red-500 text-sm px-4 py-3">{searchError}</p>
            {:else if searchResults === null}
              <p class="text-gray-400 text-sm px-4 py-3">入力中...</p>
            {:else if searchResults.length === 0}
              <p class="text-gray-400 text-sm px-4 py-3">見つかりませんでした</p>
            {:else}
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
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
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
              class="px-6 py-2 rounded-full border border-indigo-300 text-indigo-600 text-sm font-semibold hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              {loadingMore ? "読み込み中..." : "さらに読み込む"}
            </button>
          </div>
        {/if}
      {/if}

    </div>
  </div>
</div>

<style>
  .page-wrapper {
    min-height: 100vh;
    background: linear-gradient(145deg, #84c6ff 0%, #a6b3ff 40%, #b5daf8 100%);
  }

  .page-header {
    padding: 1.5rem 1rem 3rem;
  }

  .header-inner {
    max-width: 768px;
    margin: 0 auto;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    margin-bottom: 1rem;
    transition: color 0.15s;
  }

  .back-link:hover {
    color: white;
  }

  .page-title {
    font-size: 2rem;
    font-weight: 900;
    color: white;
    margin: 0;
    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .page-subtitle {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.85);
    margin: 0.25rem 0 0;
  }

  .page-content {
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.93) 0%, #f7fbff 100%);
    border-radius: 1.5rem 1.5rem 0 0;
    min-height: calc(100vh - 11rem);
    padding: 2rem 1rem 3rem;
  }

  .content-inner {
    max-width: 768px;
    margin: 0 auto;
  }
</style>
