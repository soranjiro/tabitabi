<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { userApi } from "$lib/api/user";
  import { userAuth } from "$lib/user-auth";
  import { auth } from "$lib/auth";
  import type { UserBookmarkWithItinerary } from "@tabitabi/types";

  let loggedIn = $state(false);
  let bookmarks: UserBookmarkWithItinerary[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let username = $state<string | null>(null);

  // ログイン/登録フォームの状態
  let mode = $state<"login" | "register">("login");
  let email = $state("");
  let password = $state("");
  let usernameInput = $state("");
  let formError = $state<string | null>(null);
  let submitting = $state(false);

  async function syncLocalBookmarks() {
    const history = auth.getHistory();
    const ids = history
      .filter((h) => h.shioriId !== "demo")
      .map((h) => h.shioriId);
    if (ids.length === 0) return;
    try {
      await userApi.syncBookmarks(ids);
    } catch {
      // sync 失敗はサイレントに無視（shiori_history は保持したまま）
    }
  }

  onMount(async () => {
    loggedIn = userAuth.isLoggedIn();
    if (!loggedIn) {
      loading = false;
      return;
    }

    const user = userAuth.getUser();
    username = user?.username ?? null;

    await loadBookmarks();
  });

  async function loadBookmarks() {
    try {
      loading = true;
      const result = await userApi.getMyBookmarks();
      bookmarks = result.bookmarks;
    } catch (e) {
      error = "しおりの読み込みに失敗しました";
    } finally {
      loading = false;
    }
  }

  async function handleSubmit() {
    formError = null;
    submitting = true;
    try {
      if (mode === "login") {
        const result = await userApi.login({ email, password });
        userAuth.setSession(result.token, result.user);
      } else {
        const result = await userApi.register({ username: usernameInput, email, password });
        userAuth.setSession(result.token, result.user);
      }
      username = userAuth.getUser()?.username ?? null;
      loggedIn = userAuth.isLoggedIn();
      await syncLocalBookmarks();
      await loadBookmarks();
    } catch (e) {
      formError = e instanceof Error ? e.message : "エラーが発生しました";
    } finally {
      submitting = false;
    }
  }

  function handleLogout() {
    userAuth.clearSession();
    loggedIn = false;
    bookmarks = [];
    username = null;
    email = "";
    password = "";
    goto("/");
  }

  async function toggleVisibility(itineraryId: string, current: boolean) {
    // 楽観的更新
    bookmarks = bookmarks.map((b) =>
      b.itinerary_id === itineraryId ? { ...b, is_visible: !current } : b
    );
    try {
      await userApi.updateVisibility(itineraryId, { is_visible: !current });
    } catch {
      // 失敗時はロールバック
      bookmarks = bookmarks.map((b) =>
        b.itinerary_id === itineraryId ? { ...b, is_visible: current } : b
      );
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ja-JP");
  }
</script>

<svelte:head>
  <title>マイページ - Tabitabi</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-3xl mx-auto px-4 py-8">

    {#if !loggedIn}
      <!-- ログイン / 新規登録フォーム -->
      <div class="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
        <h1 class="text-2xl font-bold text-gray-900 mb-6">
          {mode === "login" ? "ログイン" : "新規登録"}
        </h1>

        <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
          {#if mode === "register"}
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">ユーザー名</label>
              <input
                type="text"
                bind:value={usernameInput}
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          {/if}
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <input
              type="email"
              bind:value={email}
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <input
              type="password"
              bind:value={password}
              required
              class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {#if formError}
            <p class="text-red-500 text-sm">{formError}</p>
          {/if}

          <button
            type="submit"
            disabled={submitting}
            class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-md transition-colors"
          >
            {submitting ? "処理中..." : mode === "login" ? "ログイン" : "登録"}
          </button>
        </form>

        <p class="mt-4 text-sm text-center text-gray-600">
          {#if mode === "login"}
            アカウントをお持ちでない方は
            <button onclick={() => { mode = "register"; formError = null; }} class="text-indigo-600 hover:underline">
              新規登録
            </button>
          {:else}
            すでにアカウントをお持ちの方は
            <button onclick={() => { mode = "login"; formError = null; }} class="text-indigo-600 hover:underline">
              ログイン
            </button>
          {/if}
        </p>
      </div>

    {:else}
      <!-- マイページ本体 -->
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">マイページ</h1>
          {#if username}
            <p class="text-sm text-gray-500 mt-1">
              <a href="/users/{username}" class="text-indigo-600 hover:underline">@{username}</a>
              のパブリックプロフィール
            </p>
          {/if}
        </div>
        <button
          onclick={handleLogout}
          class="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded-md px-3 py-1"
        >
          ログアウト
        </button>
      </div>

      {#if loading}
        <p class="text-gray-500 text-center py-12">読み込み中...</p>
      {:else if error}
        <p class="text-red-500 text-center py-12">{error}</p>
      {:else if bookmarks.length === 0}
        <div class="text-center py-12">
          <p class="text-gray-500 mb-2">まだしおりがありません</p>
          <a href="/" class="text-indigo-600 hover:underline text-sm">しおりを作成する</a>
        </div>
      {:else}
        <div class="space-y-3">
          {#each bookmarks as bookmark}
            <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex items-center justify-between">
              <div class="flex-1 min-w-0">
                <a
                  href="/{bookmark.itinerary_id}"
                  class="font-medium text-gray-900 hover:text-indigo-600 truncate block"
                >
                  {bookmark.title}
                </a>
                <p class="text-xs text-gray-400 mt-0.5">{formatDate(bookmark.created_at)}</p>
              </div>

              <div class="flex items-center gap-3 ml-4 flex-shrink-0">
                {#if bookmark.is_password_protected}
                  <span class="text-xs text-gray-400 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd" />
                    </svg>
                    鍵あり
                  </span>
                {/if}

                <button
                  onclick={() => toggleVisibility(bookmark.itinerary_id, bookmark.is_visible)}
                  class="text-xs px-2 py-1 rounded border transition-colors {bookmark.is_visible
                    ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                    : 'border-gray-300 text-gray-500 bg-gray-50 hover:bg-gray-100'}"
                >
                  {bookmark.is_visible ? "公開" : "非公開"}
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>
