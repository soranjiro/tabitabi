<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { userApi } from "$lib/api/user";
  import type { PublicBookmark } from "@tabitabi/types";

  const username = $derived($page.params.username);

  let bookmarks: PublicBookmark[] = $state([]);
  let loading = $state(true);
  let notFound = $state(false);

  onMount(async () => {
    if (!username) {
      notFound = true;
      loading = false;
      return;
    }
    try {
      const result = await userApi.getPublicBookmarks(username);
      bookmarks = result.bookmarks;
    } catch (e) {
      notFound = true;
    } finally {
      loading = false;
    }
  });

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ja-JP");
  }
</script>

<svelte:head>
  <title>@{username} - たびたび</title>
</svelte:head>

<div class="page-wrapper">
  <header class="page-header">
    <div class="header-inner">
      <a href="/users" class="back-link">← みんなのしおり</a>
      {#if !loading && !notFound}
        <h1 class="page-title">@{username}</h1>
        <p class="page-subtitle">公開しおり一覧</p>
      {:else if notFound}
        <h1 class="page-title">ユーザーが見つかりません</h1>
      {:else}
        <h1 class="page-title">@{username}</h1>
      {/if}
    </div>
  </header>

  <div class="page-content">
    <div class="content-inner">

      {#if loading}
        <p class="text-gray-500 text-center py-12">読み込み中...</p>
      {:else if notFound}
        <div class="text-center py-12">
          <p class="text-gray-500 mb-2">ユーザーが見つかりませんでした</p>
          <a href="/users" class="text-indigo-600 hover:underline text-sm">一覧へ戻る</a>
        </div>
      {:else if bookmarks.length === 0}
        <p class="text-gray-400 text-center py-12">公開されているしおりはありません</p>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each bookmarks as bookmark}
            <a
              href="/{bookmark.itinerary_id}"
              class="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow block"
            >
              <h3 class="font-medium text-gray-900 truncate">{bookmark.title}</h3>
              <p class="text-xs text-gray-400 mt-1">{formatDate(bookmark.created_at)}</p>
            </a>
          {/each}
        </div>
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
