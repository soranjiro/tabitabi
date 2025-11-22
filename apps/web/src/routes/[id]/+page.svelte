<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { itineraryApi } from "$lib/api/itinerary";
  import { stepApi } from "$lib/api/step";
  import { auth } from "$lib/auth";
  import { onMount } from "svelte";

  let { data } = $props();

  let ItineraryView = $derived(data.theme.components.ItineraryView);
  let backgroundColor = $derived(
    data.theme.ui.customColors?.background || "#f9fafb",
  );
  let themeColor = $derived(data.theme.ui.customColors?.primary || "#4f46e5");

  onMount(() => {
    auth.updateAccessTime(data.itinerary.id, data.itinerary.title);
    document.body.style.backgroundColor = backgroundColor;

    return () => {
      document.body.style.backgroundColor = "";
    };
  });

  async function handleUpdateItinerary(updateData: {
    title?: string;
    theme_id?: string;
    memo?: string;
  }) {
    try {
      await itineraryApi.update(data.itinerary.id, updateData);
      await invalidateAll();
      if (updateData.title) {
        auth.updateAccessTime(data.itinerary.id, updateData.title);
      }
    } catch (error) {
      console.error("Failed to update itinerary:", error);
      alert("しおりの更新に失敗しました");
    }
  }

  async function handleCreateStep(stepData: {
    title: string;
    date: string;
    time: string;
    location?: string;
    notes?: string;
  }) {
    try {
      await stepApi.create(
        {
          itinerary_id: data.itinerary.id,
          ...stepData,
        },
        data.itinerary.id,
      );
      await invalidateAll();
    } catch (error) {
      console.error("Failed to create step:", error);
      alert("予定の作成に失敗しました");
    }
  }

  async function handleUpdateStep(
    stepId: string,
    updateData: {
      title?: string;
      date?: string;
      time?: string;
      location?: string;
      notes?: string;
    },
  ) {
    try {
      await stepApi.update(stepId, updateData, data.itinerary.id);
      await invalidateAll();
    } catch (error) {
      console.error("Failed to update step:", error);
      alert("予定の更新に失敗しました");
    }
  }

  async function handleDeleteStep(stepId: string) {
    try {
      await stepApi.delete(stepId, data.itinerary.id);
      await invalidateAll();
    } catch (error) {
      console.error("Failed to delete step:", error);
      alert("予定の削除に失敗しました");
    }
  }
</script>

<svelte:head>
  <title>{data.itinerary.title} - たびたび</title>
  <meta name="theme-color" content={backgroundColor} />
</svelte:head>

<ItineraryView
  itinerary={data.itinerary}
  steps={data.steps}
  onUpdateItinerary={handleUpdateItinerary}
  onCreateStep={handleCreateStep}
  onUpdateStep={handleUpdateStep}
  onDeleteStep={handleDeleteStep}
/>
