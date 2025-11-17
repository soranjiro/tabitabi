<script lang="ts">
  import { goto } from "$app/navigation";
  import { itineraryApi } from "$lib/api/itinerary";

  let title = $state("");
  let creating = $state(false);

  async function createItinerary() {
    if (!title.trim()) return;

    creating = true;
    try {
      const created = await itineraryApi.create({ title: title.trim() });
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
</script>

<svelte:head>
  <title>Tabitabi - 旅のしおり</title>
</svelte:head>

<div
  class="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-blue-50 to-indigo-100"
>
  <div class="text-center max-w-lg w-full">
    <h1 class="text-5xl font-bold text-indigo-600 mb-3">✈️ Tabitabi</h1>
    <p class="text-lg text-gray-600 mb-12">旅のしおりを、サクッと作成</p>

    <div class="bg-white rounded-2xl shadow-xl p-8">
      <input
        type="text"
        bind:value={title}
        onkeypress={handleKeyPress}
        placeholder="旅のタイトルを入力..."
        class="w-full text-xl px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors mb-4"
        disabled={creating}
        autofocus
      />

      <button
        onclick={createItinerary}
        disabled={!title.trim() || creating}
        class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-lg py-3 px-6 rounded-lg transition-colors"
      >
        {creating ? "作成中..." : "しおりを作成 →"}
      </button>

      <p class="text-sm text-gray-500 mt-6">
        URLが発行されます。仲間と共有しよう！
      </p>
    </div>
  </div>
</div>
