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

  // プロフィール編集の状態
  let editSection = $state<"none" | "profile" | "password">("none");
  let editUsername = $state("");
  let editEmail = $state("");
  let editError = $state<string | null>(null);
  let editSuccess = $state<string | null>(null);
  let editSubmitting = $state(false);

  // パスワード変更の状態
  let currentPassword = $state("");
  let newPassword = $state("");
  let confirmPassword = $state("");

  async function syncLocalBookmarks() {
    const history = auth.getHistory();
    const ids = history
      .filter((h) => h.shioriId !== "demo" && h.token !== null)
      .map((h) => h.shioriId);
    if (ids.length === 0) return;
    const chunkSize = 50;
    try {
      for (let i = 0; i < ids.length; i += chunkSize) {
        await userApi.syncBookmarks(ids.slice(i, i + chunkSize));
      }
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
    editUsername = username ?? "";

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

  function openProfileEdit() {
    editUsername = username ?? "";
    editEmail = "";
    editError = null;
    editSuccess = null;
    editSection = "profile";
  }

  function openPasswordEdit() {
    currentPassword = "";
    newPassword = "";
    confirmPassword = "";
    editError = null;
    editSuccess = null;
    editSection = "password";
  }

  function closeEdit() {
    editSection = "none";
    editError = null;
    editSuccess = null;
  }

  async function handleProfileUpdate() {
    editError = null;
    editSuccess = null;

    const updates: { username?: string; email?: string } = {};
    if (editUsername && editUsername !== username) updates.username = editUsername;
    if (editEmail) updates.email = editEmail;

    if (!updates.username && !updates.email) {
      editError = "変更する項目を入力してください";
      return;
    }

    editSubmitting = true;
    try {
      const result = await userApi.updateProfile(updates);
      userAuth.updateUser({ username: result.username });
      username = result.username;
      editSuccess = "プロフィールを更新しました";
      editSection = "none";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      if (msg === "USERNAME_ALREADY_EXISTS") editError = "このユーザー名はすでに使われています";
      else if (msg === "EMAIL_ALREADY_EXISTS") editError = "このメールアドレスはすでに登録されています";
      else if (msg.includes("3 and 20")) editError = "ユーザー名は3〜20文字で入力してください";
      else if (msg.includes("email")) editError = "メールアドレスの形式が正しくありません";
      else editError = msg;
    } finally {
      editSubmitting = false;
    }
  }

  async function handlePasswordUpdate() {
    editError = null;
    editSuccess = null;

    if (!currentPassword || !newPassword || !confirmPassword) {
      editError = "すべての項目を入力してください";
      return;
    }
    if (newPassword !== confirmPassword) {
      editError = "新しいパスワードが一致しません";
      return;
    }
    if (newPassword.length < 8) {
      editError = "新しいパスワードは8文字以上で入力してください";
      return;
    }

    editSubmitting = true;
    try {
      await userApi.updatePassword({ current_password: currentPassword, new_password: newPassword });
      editSuccess = "パスワードを変更しました";
      editSection = "none";
    } catch (e) {
      const msg = e instanceof Error ? e.message : "エラーが発生しました";
      if (msg.includes("incorrect")) editError = "現在のパスワードが正しくありません";
      else editError = msg;
    } finally {
      editSubmitting = false;
    }
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

      <!-- 成功メッセージ -->
      {#if editSuccess}
        <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          {editSuccess}
        </div>
      {/if}

      <!-- プロフィール編集セクション -->
      {#if editSection === "none"}
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 flex items-center justify-between">
          <div class="text-sm text-gray-700">
            <p class="font-medium">アカウント設定</p>
            <p class="text-gray-400 text-xs mt-0.5">ユーザー名・メール・パスワードを変更できます</p>
          </div>
          <div class="flex gap-2">
            <button
              onclick={openProfileEdit}
              class="text-xs px-3 py-1.5 rounded-md border border-indigo-300 text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              プロフィール編集
            </button>
            <button
              onclick={openPasswordEdit}
              class="text-xs px-3 py-1.5 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              パスワード変更
            </button>
          </div>
        </div>

      {:else if editSection === "profile"}
        <!-- プロフィール編集フォーム -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
          <h2 class="text-base font-semibold text-gray-900 mb-4">プロフィール編集</h2>
          <form onsubmit={(e) => { e.preventDefault(); handleProfileUpdate(); }} class="space-y-4">
            <div>
              <label for="edit-username" class="block text-sm font-medium text-gray-700 mb-1">ユーザー名 <span class="text-gray-400 font-normal">(3〜20文字)</span></label>
              <input
                id="edit-username"
                type="text"
                bind:value={editUsername}
                minlength={3}
                maxlength={20}
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label for="edit-email" class="block text-sm font-medium text-gray-700 mb-1">新しいメールアドレス <span class="text-gray-400 font-normal">(変更する場合のみ)</span></label>
              <input
                id="edit-email"
                type="email"
                bind:value={editEmail}
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {#if editError}
              <p class="text-red-500 text-sm">{editError}</p>
            {/if}
            <div class="flex gap-2 justify-end">
              <button
                type="button"
                onclick={closeEdit}
                class="text-sm px-4 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                class="text-sm px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-colors"
              >
                {editSubmitting ? "更新中..." : "更新する"}
              </button>
            </div>
          </form>
        </div>

      {:else if editSection === "password"}
        <!-- パスワード変更フォーム -->
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-5 mb-6">
          <h2 class="text-base font-semibold text-gray-900 mb-4">パスワード変更</h2>
          <form onsubmit={(e) => { e.preventDefault(); handlePasswordUpdate(); }} class="space-y-4">
            <div>
              <label for="current-password" class="block text-sm font-medium text-gray-700 mb-1">現在のパスワード</label>
              <input
                id="current-password"
                type="password"
                bind:value={currentPassword}
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label for="new-password" class="block text-sm font-medium text-gray-700 mb-1">新しいパスワード <span class="text-gray-400 font-normal">(8文字以上)</span></label>
              <input
                id="new-password"
                type="password"
                bind:value={newPassword}
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label for="confirm-password" class="block text-sm font-medium text-gray-700 mb-1">新しいパスワード（確認）</label>
              <input
                id="confirm-password"
                type="password"
                bind:value={confirmPassword}
                required
                class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            {#if editError}
              <p class="text-red-500 text-sm">{editError}</p>
            {/if}
            <div class="flex gap-2 justify-end">
              <button
                type="button"
                onclick={closeEdit}
                class="text-sm px-4 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={editSubmitting}
                class="text-sm px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold transition-colors"
              >
                {editSubmitting ? "変更中..." : "変更する"}
              </button>
            </div>
          </form>
        </div>
      {/if}

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
