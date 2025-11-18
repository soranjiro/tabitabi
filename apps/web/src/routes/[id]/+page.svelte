<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { itineraryApi } from "$lib/api/itinerary";
  import { stepApi } from "$lib/api/step";

  let { data } = $props();

  let ItineraryView = $derived(data.theme.components.ItineraryView);

  async function handleUpdateItinerary(updateData: {
    title?: string;
    theme_id?: string;
  }) {
    try {
      await itineraryApi.update(data.itinerary.id, updateData);
      await invalidateAll();
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
      await stepApi.create({
        itinerary_id: data.itinerary.id,
        ...stepData,
      });
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
      await stepApi.update(stepId, updateData);
      await invalidateAll();
    } catch (error) {
      console.error("Failed to update step:", error);
      alert("予定の更新に失敗しました");
    }
  }

  async function handleDeleteStep(stepId: string) {
    try {
      await stepApi.delete(stepId);
      await invalidateAll();
    } catch (error) {
      console.error("Failed to delete step:", error);
      alert("予定の削除に失敗しました");
    }
  }
</script>

<svelte:head>
  <title>{data.itinerary.title} - Tabitabi</title>
</svelte:head>

<ItineraryView
  itinerary={data.itinerary}
  steps={data.steps}
  onUpdateItinerary={handleUpdateItinerary}
  onCreateStep={handleCreateStep}
  onUpdateStep={handleUpdateStep}
  onDeleteStep={handleDeleteStep}
/>
