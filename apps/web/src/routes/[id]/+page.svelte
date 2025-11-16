<script lang="ts">
  import { stepApi } from "$lib/api/step";
  import { page } from "$app/stores";

  let { data } = $props();
  let steps = $state(data.steps);
  let itinerary = $state(data.itinerary);

  let showAddStep = $state(false);
  let newStep = $state({
    title: "",
    time: "",
    location: "",
    note: "",
  });

  // URL共有用
  let shareUrl = $derived($page.url.href);
  let copied = $state(false);

  function copyUrl() {
    navigator.clipboard.writeText(shareUrl);
    copied = true;
    setTimeout(() => (copied = false), 2000);
  }

  async function addStep() {
    if (!newStep.title.trim()) return;

    try {
      const created = await stepApi.create(itinerary.id, {
        title: newStep.title.trim(),
        time: newStep.time || undefined,
        location: newStep.location || undefined,
        note: newStep.note || undefined,
      });

      steps = [...steps, created];
      newStep = { title: "", time: "", location: "", note: "" };
      showAddStep = false;
    } catch (error) {
      console.error("Failed to add step:", error);
    }
  }

  async function deleteStep(stepId: string) {
    if (!confirm("削除しますか?")) return;

    try {
      await stepApi.delete(stepId);
      steps = steps.filter((s) => s.id !== stepId);
    } catch (error) {
      console.error("Failed to delete step:", error);
    }
  }
</script>

<svelte:head>
  <title>{itinerary.title} - Tabitabi</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-3xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="bg-white rounded-lg shadow-sm p-6 mb-4">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">
        {itinerary.title}
      </h1>

      <div class="flex gap-2">
        <button
          onclick={copyUrl}
          class="flex-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium py-2 px-4 rounded-lg transition-colors text-sm"
        >
          {copied ? "✓ コピーしました!" : "📋 URLをコピー"}
        </button>
      </div>
    </div>

    <!-- Steps -->
    <div class="bg-white rounded-lg shadow-sm p-6">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-semibold text-gray-900">予定</h2>
        <button
          onclick={() => (showAddStep = !showAddStep)}
          class="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
        >
          ＋ 追加
        </button>
      </div>

      {#if showAddStep}
        <div class="bg-gray-50 rounded-lg p-4 mb-4 border-2 border-indigo-200">
          <div class="space-y-3">
            <input
              type="text"
              bind:value={newStep.title}
              placeholder="何をする？（必須）"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
            <div class="grid grid-cols-2 gap-2">
              <input
                type="time"
                bind:value={newStep.time}
                placeholder="時刻"
                class="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
              <input
                type="text"
                bind:value={newStep.location}
                placeholder="場所"
                class="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <textarea
              bind:value={newStep.note}
              placeholder="メモ（オプション）"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            ></textarea>
            <div class="flex gap-2">
              <button
                onclick={addStep}
                class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                追加
              </button>
              <button
                onclick={() => (showAddStep = false)}
                class="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      {/if}

      {#if steps.length === 0}
        <div class="text-center py-12 text-gray-400">
          <p class="text-lg">まだ予定がありません</p>
          <p class="text-sm mt-2">「追加」ボタンから予定を追加しましょう</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each steps as step, index}
            <div
              class="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors bg-white"
            >
              <div class="flex items-start gap-3">
                <span
                  class="flex-shrink-0 w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-semibold"
                >
                  {index + 1}
                </span>
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-gray-900">{step.title}</h3>
                  <div class="mt-1 space-y-1 text-sm text-gray-600">
                    {#if step.time}
                      <div class="flex items-center gap-1">
                        <span>🕐</span>
                        <span>{step.time}</span>
                      </div>
                    {/if}
                    {#if step.location}
                      <div class="flex items-center gap-1">
                        <span>📍</span>
                        <span>{step.location}</span>
                      </div>
                    {/if}
                    {#if step.note}
                      <div
                        class="mt-2 text-gray-500 text-xs whitespace-pre-wrap"
                      >
                        {step.note}
                      </div>
                    {/if}
                  </div>
                </div>
                <button
                  onclick={() => deleteStep(step.id)}
                  class="flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
