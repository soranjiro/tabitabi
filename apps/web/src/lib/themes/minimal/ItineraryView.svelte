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
  }>({
    title: "",
  });

  let editedStep = $state<{
    title: string;
    time?: string | null;
    location?: string | null;
  }>({
    title: "",
  });

  $effect(() => {
    editedItinerary = {
      title: itinerary.title,
      startDate: itinerary.startDate,
      endDate: itinerary.endDate,
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
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
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

<div class="min-h-screen bg-white">
  <div class="max-w-2xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="mb-6">
      <button
        onclick={() => goto("/itineraries")}
        class="text-gray-500 hover:text-gray-700 mb-3 text-sm"
      >
        ← 戻る
      </button>

      {#if showEditItinerary}
        <!-- Edit Mode -->
        <div class="mb-4 space-y-3">
          <input
            type="text"
            bind:value={editedItinerary.title}
            class="w-full text-2xl font-bold border-b-2 border-gray-200 focus:border-blue-500 outline-none px-0 py-2"
            placeholder="タイトル"
          />
          <div class="flex gap-2">
            <input
              type="date"
              bind:value={editedItinerary.startDate}
              class="flex-1 text-sm px-2 py-1 border border-gray-200 rounded"
            />
            <span class="text-gray-400">〜</span>
            <input
              type="date"
              bind:value={editedItinerary.endDate}
              class="flex-1 text-sm px-2 py-1 border border-gray-200 rounded"
            />
          </div>
          <div class="flex gap-2 pt-2">
            <button
              onclick={updateItinerary}
              class="text-sm px-4 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              保存
            </button>
            <button
              onclick={() => (showEditItinerary = false)}
              class="text-sm px-4 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              キャンセル
            </button>
            <button
              onclick={deleteItinerary}
              class="ml-auto text-sm px-4 py-1.5 text-red-600 hover:bg-red-50 rounded"
            >
              削除
            </button>
          </div>
        </div>
      {:else}
        <!-- Display Mode -->
        <div class="flex justify-between items-start mb-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 mb-1">
              {itinerary.title}
            </h1>
            {#if itinerary.startDate && itinerary.endDate}
              <p class="text-sm text-gray-500">
                {formatDate(itinerary.startDate)} 〜 {formatDate(
                  itinerary.endDate,
                )}
              </p>
            {/if}
          </div>
          <button
            onclick={() => (showEditItinerary = true)}
            class="text-sm text-gray-600 hover:text-gray-900"
          >
            編集
          </button>
        </div>
      {/if}
    </div>

    <!-- Timeline -->
    <div class="space-y-3">
      <div class="flex justify-between items-center mb-3">
        <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          タイムライン
        </h2>
        <button
          onclick={() => (showAddStep = !showAddStep)}
          class="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showAddStep ? "キャンセル" : "+ 追加"}
        </button>
      </div>

      {#if showAddStep}
        <div class="bg-gray-50 rounded-lg p-4 mb-3 space-y-2">
          <input
            type="text"
            bind:value={newStep.title}
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="タイトル"
          />
          <div class="flex gap-2">
            <input
              type="time"
              bind:value={newStep.time}
              class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="text"
              bind:value={newStep.location}
              class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="場所"
            />
          </div>
          <button
            onclick={addStep}
            class="w-full bg-blue-500 text-white text-sm font-medium py-2 rounded hover:bg-blue-600"
          >
            追加
          </button>
        </div>
      {/if}

      {#if timeline.length === 0}
        <div class="text-center py-12 text-gray-400 text-sm">
          <p>まだステップがありません</p>
        </div>
      {:else}
        <div class="space-y-2">
          {#each timeline as step, index}
            <div
              class="border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors"
            >
              {#if editingStepId === step.id}
                <!-- Edit Mode -->
                <div class="space-y-2">
                  <input
                    type="text"
                    bind:value={editedStep.title}
                    class="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  />
                  <div class="flex gap-2">
                    <input
                      type="time"
                      bind:value={editedStep.time}
                      class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      bind:value={editedStep.location}
                      class="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                      placeholder="場所"
                    />
                  </div>
                  <div class="flex gap-2">
                    <button
                      onclick={() => updateStep(step.id)}
                      class="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      保存
                    </button>
                    <button
                      onclick={cancelEditStep}
                      class="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              {:else}
                <!-- Display Mode -->
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <div class="flex items-baseline gap-2 mb-1">
                      <span class="text-xs font-semibold text-gray-400 w-6">
                        {index + 1}
                      </span>
                      <h3 class="text-base font-medium text-gray-900">
                        {step.title}
                      </h3>
                    </div>
                    <div class="ml-8 text-xs text-gray-500 space-y-0.5">
                      {#if step.time}
                        <div>{step.time}</div>
                      {/if}
                      {#if step.location}
                        <div>📍 {step.location}</div>
                      {/if}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <button
                      onclick={() => startEditStep(step)}
                      class="text-xs text-blue-600 hover:text-blue-700"
                    >
                      編集
                    </button>
                    <button
                      onclick={() => deleteStep(step.id)}
                      class="text-xs text-red-600 hover:text-red-700"
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
