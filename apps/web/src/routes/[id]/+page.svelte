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

  // Use local state for steps to allow client-side updates (e.g. unmasking secrets)
  let steps = $state(data.steps);

  // Freeze itinerary object to prevent accidental modification
  let itinerary = $derived.by(() => {
    return Object.freeze({ ...data.itinerary });
  });

  // Update steps when data changes (e.g. after invalidateAll)
  $effect(() => {
    steps = data.steps;
  });

  onMount(() => {
    const init = async () => {
      auth.updateAccessTime(data.itinerary.id, data.itinerary.title);
      document.body.style.backgroundColor = backgroundColor;
      document.documentElement.style.backgroundColor = backgroundColor;

      // Check if we have edit permission and need to re-fetch steps to reveal secrets
      const token =
        auth.extractTokenFromUrl() || auth.getToken(data.itinerary.id);
      if (token) {
        // If we have a token, we might be in edit mode.
        // If the initial load was SSR, steps might be masked.
        // We should re-fetch to get the unmasked data.
        // We can check if any step is hidden or just force re-fetch if secret mode is enabled.
        if (data.itinerary.secret_settings?.enabled) {
          try {
            const unmaskedSteps = await stepApi.list(data.itinerary.id);
            steps = unmaskedSteps;
          } catch (e) {
            console.error("Failed to re-fetch steps:", e);
          }
        }
      }
    };

    init();

    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  });

  // ... existing functions ...

  // Update the ItineraryView prop to use `steps` instead of `data.steps`
  // We need to find where ItineraryView is used.

  async function handleUpdateItinerary(updateData: {
    title?: string;
    theme_id?: string;
    memo?: string;
    walica_id?: string | null;
    secret_settings?: {
      enabled: boolean;
      offset_minutes: number;
    } | null;
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

{#key data.itinerary.theme_id}
  <ItineraryView
    itinerary
    {steps}
    onUpdateItinerary={handleUpdateItinerary}
    onCreateStep={handleCreateStep}
    onUpdateStep={handleUpdateStep}
    onDeleteStep={handleDeleteStep}
  />
{/key}
