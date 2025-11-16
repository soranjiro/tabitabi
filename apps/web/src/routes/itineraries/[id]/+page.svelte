<script lang="ts">
  import { goto } from "$app/navigation";
  import { timelineApi } from "$lib/api/timeline";
  import type { TimelineStep } from "@tabitabi/types";

  let { data } = $props();
  let { itinerary, timeline } = $derived(data);

  let showAddStep = $state(false);
  let newStep = $state({
    title: "",
    startTime: "",
    location: "",
  });

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP");
  }

  async function addStep() {
    try {
      await timelineApi.create(itinerary.id, newStep);
      location.reload(); // Reload to refresh data
    } catch (error) {
      console.error("Failed to add step:", error);
    }
  }

  async function deleteStep(stepId: string) {
    if (!confirm("このステップを削除しますか?")) return;
    try {
      await timelineApi.delete(stepId);
      location.reload();
    } catch (error) {
      console.error("Failed to delete step:", error);
    }
  }
</script>

<svelte:head>
  <title>{itinerary.title} - Tabitabi</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-4xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="mb-8">
      <button
        onclick={() => goto("/itineraries")}
        class="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center"
      >
        ← 一覧に戻る
      </button>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        {itinerary.title}
      </h1>
      <p class="text-gray-600">
        {formatDate(itinerary.startDate)} 〜 {formatDate(itinerary.endDate)}
      </p>
      <span
        class="inline-block mt-2 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded"
      >
        テーマ: {itinerary.themeId === "minimal" ? "ミニマル" : "スタンダード"}
      </span>
    </div>

    <!-- Timeline Section -->
    <div class="bg-white rounded-lg shadow-md p-6 mb-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-gray-900">タイムライン</h2>
        <button
          onclick={() => (showAddStep = !showAddStep)}
          class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold py-2 px-4 rounded-md transition-colors"
        >
          ステップ追加
        </button>
      </div>

      {#if showAddStep}
        <div class="bg-gray-50 rounded-lg p-4 mb-4">
          <h3 class="text-sm font-semibold mb-3">新しいステップ</h3>
          <div class="space-y-3">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                タイトル
              </label>
              <input
                type="text"
                bind:value={newStep.title}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="例: 那覇空港到着"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                時刻
              </label>
              <input
                type="time"
                bind:value={newStep.startTime}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                場所
              </label>
              <input
                type="text"
                bind:value={newStep.location}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="例: 那覇空港"
              />
            </div>
            <div class="flex gap-2">
              <button
                onclick={addStep}
                class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold py-2 px-4 rounded-md transition-colors"
              >
                追加
              </button>
              <button
                onclick={() => (showAddStep = false)}
                class="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold py-2 px-4 rounded-md transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#if timeline.length === 0}
        <div class="text-center py-8 text-gray-500">
          <p>まだステップがありません</p>
          <p class="text-sm mt-2">「ステップ追加」ボタンから追加しましょう</p>
        </div>
      {:else}
        <div class="space-y-3">
          {#each timeline as step, index}
            <div
              class="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
            >
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <div class="flex items-center gap-3 mb-2">
                    <span
                      class="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-semibold"
                    >
                      {index + 1}
                    </span>
                    <h3 class="text-lg font-semibold text-gray-900">
                      {step.title}
                    </h3>
                  </div>
                  {#if step.startTime}
                    <p class="text-sm text-gray-600 ml-11">
                      🕐 {step.startTime}
                    </p>
                  {/if}
                  {#if step.location}
                    <p class="text-sm text-gray-600 ml-11">
                      📍 {step.location}
                    </p>
                  {/if}
                </div>
                <button
                  onclick={() => deleteStep(step.id)}
                  class="text-red-600 hover:text-red-700 text-sm"
                >
                  削除
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
