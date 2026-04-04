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
  <title>@{username} - Tabitabi</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-3xl mx-auto px-4 py-8">

    {#if loading}
      <p class="text-gray-500 text-center py-12">読み込み中...</p>
    {:else if notFound}
      <div class="text-center py-12">
        <p class="text-gray-500">ユーザーが見つかりませんでした</p>
        <a href="/" class="text-indigo-600 hover:underline text-sm mt-2 inline-block">トップへ戻る</a>
      </div>
    {:else}
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">@{username}</h1>
        <p class="text-sm text-gray-500 mt-1">公開しおり一覧</p>
      </div>

      {#if bookmarks.length === 0}
        <p class="text-gray-400 text-center py-12">公開されているしおりはありません</p>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each bookmarks as bookmark}
            <a
              href="/{bookmark.itinerary_id}"
              class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow block"
            >
              <h3 class="font-medium text-gray-900 truncate">{bookmark.title}</h3>
              <p class="text-xs text-gray-400 mt-1">{formatDate(bookmark.created_at)}</p>
            </a>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>
