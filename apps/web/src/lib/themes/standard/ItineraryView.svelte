<script lang="ts">
  import { goto } from "$app/navigation";
  import { timelineApi } from "$lib/api/timeline";
  import { itineraryApi } from "$lib/api/itinerary";
  import type { Itinerary, Step } from "@tabitabi/types";

  interface Props {
    itinerary: Itinerary;
    timeline: Step[];
  }

  let { itinerary, timeline }: Props = $props();

  let showAddStep = $state(false);
  let showEditItinerary = $state(false);
  let editingStepId = $state<string | null>(null);

  let editedItinerary = $state<{
    title: string;
    startDate?: string;
    endDate?: string;
    themeId?: string;
  }>({
    title: "",
  });

  let editedStep = $state<{
    title: string;
    time?: string | null;
    location?: string | null;
    note?: string | null;
  }>({
    title: "",
  });

  $effect(() => {
    editedItinerary = {
      title: itinerary.title,
      startDate: itinerary.startDate,
      endDate: itinerary.endDate,
      themeId: itinerary.themeId,
    };
  });

  let newStep = $state({
    title: "",
    time: "",
    location: "",
  });

  function formatDate(dateStr: string | undefined) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ja-JP");
  }

  async function updateItinerary() {
    try {
      await itineraryApi.update(itinerary.id, editedItinerary);
      location.reload();
    } catch (error) {
      console.error("Failed to update itinerary:", error);
    }
  }

  async function deleteItinerary() {
    if (!confirm("このしおりを削除しますか?")) return;
    try {
      await itineraryApi.delete(itinerary.id);
      goto("/itineraries");
    } catch (error) {
      console.error("Failed to delete itinerary:", error);
    }
  }

  async function addStep() {
    try {
      await timelineApi.create(itinerary.id, newStep);
      location.reload();
    } catch (error) {
      console.error("Failed to add step:", error);
    }
  }

  function startEditStep(step: Step) {
    editingStepId = step.id;
    editedStep = {
      title: step.title,
      time: step.time,
      location: step.location,
      note: step.note,
    };
  }

  function cancelEditStep() {
    editingStepId = null;
    editedStep = { title: "" };
  }

  async function updateStep(stepId: string) {
    try {
      await timelineApi.update(stepId, editedStep);
      location.reload();
    } catch (error) {
      console.error("Failed to update step:", error);
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

      {#if showEditItinerary}
        <!-- Edit Mode -->
        <div class="bg-white rounded-lg shadow-md p-6 mb-4">
          <h2 class="text-xl font-semibold mb-4">しおりを編集</h2>
          <div class="space-y-4">
            <div>
              <label
                for="edit-title"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                タイトル
              </label>
              <input
                id="edit-title"
                type="text"
                bind:value={editedItinerary.title}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  for="edit-start-date"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  開始日
                </label>
                <input
                  id="edit-start-date"
                  type="date"
                  bind:value={editedItinerary.startDate}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label
                  for="edit-end-date"
                  class="block text-sm font-medium text-gray-700 mb-1"
                >
                  終了日
                </label>
                <input
                  id="edit-end-date"
                  type="date"
                  bind:value={editedItinerary.endDate}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div>
              <label
                for="edit-theme"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                テーマ
              </label>
              <select
                id="edit-theme"
                bind:value={editedItinerary.themeId}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="minimal">ミニマル</option>
                <option value="standard">スタンダード</option>
              </select>
            </div>
            <div class="flex gap-2">
              <button
                onclick={updateItinerary}
                class="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              >
                保存
              </button>
              <button
                onclick={() => (showEditItinerary = false)}
                class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md transition-colors"
              >
                キャンセル
              </button>
              <button
                onclick={deleteItinerary}
                class="ml-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      {:else}
        <!-- Display Mode -->
        <div class="flex justify-between items-start mb-4">
          <div>
            <h1 class="text-3xl font-bold text-gray-900 mb-2">
              {itinerary.title}
            </h1>
            {#if itinerary.startDate && itinerary.endDate}
              <p class="text-gray-600">
                {formatDate(itinerary.startDate)} 〜 {formatDate(
                  itinerary.endDate,
                )}
              </p>
            {/if}
            {#if itinerary.themeId}
              <span
                class="inline-block mt-2 text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded"
              >
                テーマ: {itinerary.themeId === "minimal"
                  ? "ミニマル"
                  : "スタンダード"}
              </span>
            {/if}
          </div>
          <button
            onclick={() => (showEditItinerary = true)}
            class="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md transition-colors"
          >
            編集
          </button>
        </div>
      {/if}
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
              <label
                for="step-title"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                タイトル
              </label>
              <input
                id="step-title"
                type="text"
                bind:value={newStep.title}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="例: 那覇空港到着"
              />
            </div>
            <div>
              <label
                for="step-time"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                時刻
              </label>
              <input
                id="step-time"
                type="time"
                bind:value={newStep.time}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label
                for="step-location"
                class="block text-sm font-medium text-gray-700 mb-1"
              >
                場所
              </label>
              <input
                id="step-location"
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
              {#if editingStepId === step.id}
                <!-- Edit Mode -->
                <div class="space-y-3">
                  <div>
                    <label
                      for="edit-step-title-{step.id}"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      タイトル
                    </label>
                    <input
                      id="edit-step-title-{step.id}"
                      type="text"
                      bind:value={editedStep.title}
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label
                      for="edit-step-time-{step.id}"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      時刻
                    </label>
                    <input
                      id="edit-step-time-{step.id}"
                      type="time"
                      bind:value={editedStep.time}
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label
                      for="edit-step-location-{step.id}"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      場所
                    </label>
                    <input
                      id="edit-step-location-{step.id}"
                      type="text"
                      bind:value={editedStep.location}
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label
                      for="edit-step-note-{step.id}"
                      class="block text-sm font-medium text-gray-700 mb-1"
                    >
                      メモ
                    </label>
                    <textarea
                      id="edit-step-note-{step.id}"
                      bind:value={editedStep.note}
                      class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      rows="2"
                    ></textarea>
                  </div>
                  <div class="flex gap-2">
                    <button
                      onclick={() => updateStep(step.id)}
                      class="bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold py-2 px-4 rounded-md transition-colors"
                    >
                      保存
                    </button>
                    <button
                      onclick={cancelEditStep}
                      class="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold py-2 px-4 rounded-md transition-colors"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              {:else}
                <!-- Display Mode -->
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
                    {#if step.time}
                      <p class="text-sm text-gray-600 ml-11">
                        🕐 {step.time}
                      </p>
                    {/if}
                    {#if step.location}
                      <p class="text-sm text-gray-600 ml-11">
                        📍 {step.location}
                      </p>
                    {/if}
                    {#if step.note}
                      <p class="text-sm text-gray-600 ml-11 mt-2">
                        {step.note}
                      </p>
                    {/if}
                  </div>
                  <div class="flex gap-2">
                    <button
                      onclick={() => startEditStep(step)}
                      class="text-primary-600 hover:text-primary-700 text-sm"
                    >
                      編集
                    </button>
                    <button
                      onclick={() => deleteStep(step.id)}
                      class="text-red-600 hover:text-red-700 text-sm"
                    >
                      削除
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>
