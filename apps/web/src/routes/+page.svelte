<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { itineraryApi } from "$lib/api/itinerary";
  import { auth } from "$lib/auth";
  import { getAvailableThemes } from "$lib/themes";
  import { isPwa } from "$lib/utils/isPwa";

  let title = $state("");
  let password = $state("");
  let theme_id = $state("standard-autumn");
  let creating = $state(false);
  let titleError = $state("");
  let recentItineraries = $state<
    Array<{ id: string; title: string; visitedAt: number }>
  >([]);
  let showRecent = $state(false);
  let activeTab = $state<"create" | "add">("create");
  let url = $state("");
  let urlError = $state("");
  let isPwaMode = $state(false);

  const themes = getAvailableThemes();

  onMount(() => {
    isPwaMode = true;
    setTimeout(() => {
      recentItineraries = auth.getRecentItineraries();
      showRecent = true;
    }, 300);
  });

  async function createItinerary() {
    titleError = "";

    if (!title.trim()) {
      titleError = "タイトルを入力してください";
      return;
    }

    creating = true;
    try {
      const created = await itineraryApi.create({
        title: title.trim(),
        theme_id,
        password: password.trim() || undefined,
      });

      if (created.token) {
        auth.setToken(created.id, created.title, created.token);
      }

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

  function removeRecent(id: string) {
    auth.removeFromHistory(id);
    recentItineraries = auth.getRecentItineraries();
  }

  function handleUrlSubmit() {
    urlError = "";

    if (!url.trim()) {
      urlError = "URLを入力してください";
      return;
    }

    try {
      const urlObj = new URL(url.trim(), window.location.origin);

      if (urlObj.origin !== window.location.origin) {
        urlError = "このサイトのURLを入力してください";
        return;
      }

      const pathname = urlObj.pathname;

      // Extract ID from pathname (format: /[id] or /[id]/...)
      const match = pathname.match(/^\/([a-zA-Z0-9_-]+)/);

      if (!match) {
        urlError = "無効なURLです";
        return;
      }

      const id = match[1];
      const token = urlObj.searchParams.get("token");

      // Navigate to the itinerary
      if (token) {
        goto(`/${id}?token=${token}`);
      } else {
        goto(`/${id}`);
      }
    } catch (error) {
      urlError = "無効なURLです";
    }
  }

  function handleUrlKeyPress(event: KeyboardEvent) {
    if (event.key === "Enter") {
      handleUrlSubmit();
    }
  }
</script>

<svelte:head>
  <title>たびたび - 旅のしおり</title>
  <meta name="theme-color" content="#f9fafb" />
</svelte:head>

<div
  class="min-h-screen flex flex-col justify-center px-4 py-8 bg-gradient-to-br from-blue-50 to-indigo-100"
>
  <div class="text-center max-w-lg w-full mx-auto">
    <h1
      class="text-5xl text-indigo-600 mt-6 mb-2"
      style="font-family: 'Hiragino Maru Gothic ProN', 'ヒラギノ丸ゴ ProN', '游ゴシック体', YuGothic, 'Yu Gothic Medium', 'メイリオ', Meiryo, sans-serif; font-weight: 1000; letter-spacing: 0.05em;"
    >
      ✈️ たびたび
    </h1>
    <p class="text-lg text-gray-600 mb-6">旅のしおりを、サクッと作成</p>

    <div class="bg-white rounded-2xl shadow-xl p-8">
      <!-- Tabs (only shown in PWA mode) -->
      {#if isPwaMode}
        <div class="flex gap-2 mb-6 border-b-2 border-gray-100 justify-center">
          <button
            onclick={() => (activeTab = "create")}
            class="px-4 py-2 font-semibold transition-all duration-200 {activeTab ===
            'create'
              ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-0.5'
              : 'text-gray-500 hover:text-gray-700'}"
          >
            作成
          </button>
          <button
            onclick={() => (activeTab = "add")}
            class="px-4 py-2 font-semibold transition-all duration-200 {activeTab ===
            'add'
              ? 'text-indigo-600 border-b-2 border-indigo-600 -mb-0.5'
              : 'text-gray-500 hover:text-gray-700'}"
          >
            追加
          </button>
        </div>
      {/if}

      <!-- Create Tab -->
      {#if activeTab === "create"}
        <div class="mb-6">
          <label
            for="title"
            class="block text-sm font-semibold text-gray-700 mb-2"
          >
            タイトル <span class="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            bind:value={title}
            onkeypress={handleKeyPress}
            class="w-full text-xl px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors {titleError
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-200 focus:border-indigo-500'}"
          />
          {#if titleError}
            <p class="text-red-500 text-sm mt-1">{titleError}</p>
          {/if}
        </div>

        <div class="mb-6">
          <label
            for="theme"
            class="block text-sm font-semibold text-gray-700 mb-2"
          >
            テーマ
          </label>
          <select
            id="theme"
            bind:value={theme_id}
            class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
          >
            {#each themes as theme}
              <option value={theme.id}
                >{theme.name} - {theme.description}</option
              >
            {/each}
          </select>
        </div>

        <div class="mb-6">
          <label
            for="password"
            class="block text-sm font-semibold text-gray-700 mb-2"
          >
            編集用パスワード
          </label>
          <input
            id="password"
            type="password"
            bind:value={password}
            class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
          />
        </div>

        <button
          onclick={createItinerary}
          class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg py-4 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          {creating ? "作成中..." : "しおりを作成 →"}
        </button>

        <p class="text-sm text-gray-500 mt-6">
          URLが発行されます。仲間と共有しよう！
        </p>
      {:else}
        <!-- Add Tab (URL Import) -->
        <div class="mb-6">
          <label
            for="url"
            class="block text-sm font-semibold text-gray-700 mb-2"
          >
            しおりのURL <span class="text-red-500">*</span>
          </label>
          <input
            id="url"
            type="text"
            bind:value={url}
            onkeypress={handleUrlKeyPress}
            placeholder="https://..."
            class="w-full text-xl px-4 py-3 border-2 rounded-lg focus:outline-none transition-colors {urlError
              ? 'border-red-500 focus:border-red-500'
              : 'border-gray-200 focus:border-indigo-500'}"
          />
          {#if urlError}
            <p class="text-red-500 text-sm mt-1">{urlError}</p>
          {/if}
        </div>

        <button
          onclick={handleUrlSubmit}
          class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg py-4 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
        >
          開く →
        </button>

        <p class="text-sm text-gray-500 mt-6">
          共有されたしおりのURLを貼り付けてください
        </p>
      {/if}
    </div>

    <!-- Recent Itineraries -->
    {#if showRecent && recentItineraries.length > 0}
      <div class="mt-8 bg-white rounded-2xl shadow-xl p-6 animate-fade-in">
        <h2 class="text-xl font-semibold text-gray-800 mb-4">📚 最近の項目</h2>
        <div class="space-y-2">
          {#each recentItineraries as item}
            <div class="flex items-center gap-2">
              <button
                onclick={() => goto(`/${item.id}`)}
                class="flex-1 text-left px-4 py-3 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 border-2 border-transparent transition-all duration-200"
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
              <button
                type="button"
                onclick={() => removeRecent(item.id)}
                class="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors text-sm"
                aria-label="履歴から削除"
              >
                ✕
              </button>
            </div>
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
