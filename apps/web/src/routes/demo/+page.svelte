<script lang="ts">
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import {
    demoStorage,
    getDemoData,
    setDemoMode,
    resetDemoMode,
  } from "$lib/demo";
  import { loadTheme, type AvailableTheme } from "$lib/themes";
  import { auth } from "$lib/auth";
  import type { Theme } from "@tabitabi/types";
  import type { Itinerary, Step } from "@tabitabi/types";

  let theme = $state<Theme | null>(null);
  let itinerary = $state<Itinerary | null>(null);
  let steps = $state<Step[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  let ItineraryView = $derived(theme?.components.ItineraryView);
  let backgroundColor = $derived(
    theme?.ui.customColors?.background || "#f9fafb",
  );

  onMount(async () => {
    try {
      // Enable demo mode for this page
      setDemoMode(true);

      // Get theme from URL parameter
      const themeId = $page.url.searchParams.get("theme") || "minimal";

      // Check if demo data exists, if not initialize
      if (!demoStorage.hasData()) {
        const demoData = getDemoData(themeId as AvailableTheme);
        demoStorage.initializeDemo(demoData);
      }

      // Load theme
      theme = await loadTheme(themeId);

      // Load data from demo storage
      itinerary = demoStorage.getItinerary();
      steps = demoStorage.getSteps();

      if (!itinerary) {
        error = "デモデータの読み込みに失敗しました";
        return;
      }

      document.body.style.backgroundColor = backgroundColor;
      document.documentElement.style.backgroundColor = backgroundColor;
      loading = false;
    } catch (e) {
      console.error("Failed to load demo:", e);
      error = "デモの読み込みに失敗しました";
    }

    return () => {
      resetDemoMode();
    };
  });

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
    const updated = demoStorage.updateItinerary(updateData);
    if (updated) {
      itinerary = updated;

      // If theme changed, reload the page with new theme
      if (updateData.theme_id && updateData.theme_id !== theme?.id) {
        demoStorage.clear();
        goto(`/demo?theme=${updateData.theme_id}`);
      }
    }
  }

  async function handleCreateStep(stepData: {
    title: string;
    date: string;
    time: string;
    location?: string;
    notes?: string;
  }) {
    if (!itinerary) return;
    const newStep = demoStorage.createStep({
      ...stepData,
      itinerary_id: itinerary.id,
    });
    steps = [...steps, newStep];
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
    const updated = demoStorage.updateStep(stepId, updateData);
    if (updated) {
      steps = steps.map((s) => (s.id === stepId ? updated : s));
    }
  }

  async function handleDeleteStep(stepId: string) {
    const deleted = demoStorage.deleteStep(stepId);
    if (deleted) {
      steps = steps.filter((s) => s.id !== stepId);
    }
  }

  function goHome() {
    demoStorage.clear();
    goto("/");
  }
</script>

<svelte:head>
  <title>デモ - たびたび</title>
  <meta name="theme-color" content={backgroundColor} />
  <meta name="robots" content="noindex" />
</svelte:head>

{#if loading}
  <div class="demo-loading">
    <div class="loading-content">
      <span class="loading-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"
          />
        </svg>
      </span>
      <p>デモを読み込み中...</p>
    </div>
  </div>
{:else if error}
  <div class="demo-error">
    <p>{error}</p>
    <button onclick={goHome}>ホームに戻る</button>
  </div>
{:else if ItineraryView && itinerary}
  <div class="demo-banner">
    <span class="demo-label">DEMO</span>
    <span class="demo-notice">変更はローカルに保存されます</span>
    <button onclick={goHome} class="demo-exit">終了</button>
  </div>

  {#key itinerary.theme_id}
    <ItineraryView
      {itinerary}
      {steps}
      onUpdateItinerary={handleUpdateItinerary}
      onCreateStep={handleCreateStep}
      onUpdateStep={handleUpdateStep}
      onDeleteStep={handleDeleteStep}
    />
  {/key}
{/if}

<style>
  .demo-loading,
  .demo-error {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(145deg, #84c6ff 0%, #a6b3ff 40%, #b5daf8 100%);
  }

  .loading-content {
    text-align: center;
    color: white;
  }

  .loading-icon {
    display: block;
    animation: bounce 1s ease-in-out infinite;
  }

  .loading-icon svg {
    width: 48px;
    height: 48px;
    fill: white;
    transform: rotate(-45deg);
  }

  @keyframes bounce {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  .demo-error {
    flex-direction: column;
    gap: 1rem;
    color: white;
  }

  .demo-error button {
    background: white;
    color: #6b8cce;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 999px;
    font-weight: 600;
    cursor: pointer;
  }

  .demo-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: linear-gradient(90deg, #fbbf24, #f59e0b);
    padding: 0.5rem 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    font-size: 0.8rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .demo-label {
    font-weight: 700;
    color: #92400e;
  }

  .demo-notice {
    color: #78350f;
  }

  .demo-exit {
    background: rgba(0, 0, 0, 0.1);
    border: none;
    padding: 0.35rem 0.75rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    color: #78350f;
    cursor: pointer;
    transition: all 0.2s;
  }

  .demo-exit:hover {
    background: rgba(0, 0, 0, 0.2);
  }

  @media (max-width: 480px) {
    .demo-notice {
      display: none;
    }
  }
</style>
