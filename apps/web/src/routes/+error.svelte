<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";

  $: status = $page.status;
  $: message = $page.error?.message || "エラーが発生しました";

  function goHome() {
    goto("/");
  }
</script>

<svelte:head>
  <title>{status} - たびたび</title>
</svelte:head>

<div
  class="min-h-screen flex flex-col justify-center px-4 py-8 bg-gradient-to-br from-blue-50 to-indigo-100"
>
  <div class="text-center max-w-lg w-full mx-auto">
    <div class="text-8xl mb-4">
      {#if status === 404}
        🧭
      {:else}
        ⚠️
      {/if}
    </div>

    <h1
      class="text-5xl text-indigo-600 mb-2"
      style="font-family: 'Hiragino Maru Gothic ProN', 'ヒラギノ丸ゴ ProN', '游ゴシック体', YuGothic, 'Yu Gothic Medium', 'メイリオ', Meiryo, sans-serif; font-weight: 1000; letter-spacing: 0.05em;"
    >
      {status}
    </h1>

    <div class="bg-white rounded-2xl shadow-xl p-8 mt-8">
      <h2 class="text-2xl font-semibold text-gray-800 mb-4">
        {#if status === 404}
          ページが見つかりません
        {:else if status >= 500}
          サーバーエラー
        {:else}
          エラーが発生しました
        {/if}
      </h2>

      <p class="text-gray-600 mb-8">
        {#if status === 404}
          お探しのページは存在しないか、削除された可能性があります
        {:else if status >= 500}
          申し訳ございません。サーバーで問題が発生しました
        {:else}
          {message}
        {/if}
      </p>

      <button
        onclick={goHome}
        class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-lg py-4 px-6 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg active:scale-[0.98]"
      >
        ホームへ戻る
      </button>
    </div>

    <p class="text-sm text-gray-500 mt-6">
      問題が続く場合は、ページを再読み込みしてください
    </p>
  </div>
</div>
