<script lang="ts">
  import { goto, invalidateAll } from "$app/navigation";
  import { itineraryApi } from "$lib/api/itinerary";
  import { userApi } from "$lib/api/user";
  import { stepApi } from "$lib/api/step";
  import { auth } from "$lib/auth";
  import { userAuth } from "$lib/user-auth";
  import LazyPrintStudio from "$lib/print/LazyPrintStudio.svelte";
  import { onMount } from "svelte";
  import type { Theme } from "@tabitabi/types";

  let { data } = $props();

  let ItineraryView = $derived(data.theme.components.ItineraryView);
  let backgroundColor = $derived(
    data.theme.ui.customColors?.background || "#f9fafb",
  );

  function applyThemeCssVars(theme: Theme) {
    const colors = theme.ui.customColors;
    if (!colors) return;
    document.documentElement.style.setProperty(
      "--theme-primary",
      colors.primary ?? "",
    );
    document.documentElement.style.setProperty(
      "--theme-secondary",
      colors.secondary ?? "",
    );
    document.documentElement.style.setProperty(
      "--theme-accent",
      colors.accent ?? "",
    );
    document.documentElement.style.setProperty(
      "--theme-text",
      colors.text ?? "",
    );
    document.documentElement.style.setProperty(
      "--theme-bg",
      colors.background ?? "",
    );
  }

  $effect(() => {
    if (data.theme) {
      applyThemeCssVars(data.theme);
    }
  });

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
      // Record password protection state for client-side header resolution
      auth.setPasswordProtected(
        data.itinerary.id,
        data.itinerary.is_password_protected,
      );

      auth.updateAccessTime(data.itinerary.id, data.itinerary.title);
      document.body.style.backgroundColor = backgroundColor;
      document.documentElement.style.backgroundColor = backgroundColor;

      // Check if we have edit permission and need to re-fetch steps to reveal secrets
      const token =
        auth.extractTokenFromUrl() || auth.getToken(data.itinerary.id);
      if (token && data.itinerary.is_password_protected) {
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
    default_view_mode?: import("@tabitabi/types").ItineraryViewMode;
    memo?: string;
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
    // Unix ms
    start_at: number;
    // Unix ms
    end_at: number;
    location?: string;
    notes?: string;
    link?: string | null;
    type?: import("@tabitabi/types").StepType;
    is_all_day?: boolean;
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
      start_at?: number;
      end_at?: number;
      location?: string;
      notes?: string;
      link?: string | null;
      type?: import("@tabitabi/types").StepType;
      is_all_day?: boolean;
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

  async function handlePublishItinerary(metadata: {
    prefectureSlugs: string[];
    areas: string[];
    tags: string[];
  }) {
    const result = await userApi.publishBookmark(data.itinerary.id, {
      prefecture_slugs: metadata.prefectureSlugs,
      areas: metadata.areas,
      tags: metadata.tags,
    });
    return result.id;
  }

  let isViewOnly = $derived(!!data.itinerary.source_itinerary_id);

  let forking = $state(false);

  async function handleFork() {
    if (forking) return;
    if (!userAuth.isLoggedIn()) {
      sessionStorage.setItem("tabitabi_pending_fork", data.itinerary.id);
      await goto("/profile");
      return;
    }
    forking = true;
    try {
      const result = await itineraryApi.fork(data.itinerary.id);
      auth.setToken(result.id, result.title, result.token);
      // 同じ動的ルート内の遷移では、テーマコンポーネントの編集状態が残ることがあるため、
      // コピー先は新しいページとして開いて確実に自分用のしおりだけを表示する。
      window.location.assign(`/itineraries/${result.id}`);
    } catch (error) {
      console.error("Failed to fork itinerary:", error);
      alert("コピーに失敗しました");
    } finally {
      forking = false;
    }
  }
</script>

<svelte:head>
  <title>{data.itinerary.title} - たびたび</title>
  <meta
    name="description"
    content="{data.itinerary.title}の旅のしおり。たびたびで作成された旅行計画を確認できます。"
  />
  <link rel="canonical" href="https://tabitabi.pages.dev/itineraries/{data.itinerary.id}" />
  <meta property="og:title" content="{data.itinerary.title} - たびたび" />
  <meta
    property="og:description"
    content="{data.itinerary.title}の旅のしおり。たびたびで作成された旅行計画を確認できます。"
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tabitabi.pages.dev/itineraries/{data.itinerary.id}" />
  <meta property="og:image" content="https://tabitabi.pages.dev/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="ja_JP" />
  <meta property="og:site_name" content="たびたび" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{data.itinerary.title} - たびたび" />
  <meta
    name="twitter:description"
    content="{data.itinerary.title}の旅のしおり。たびたびで作成された旅行計画を確認できます。"
  />
  <meta name="twitter:image" content="https://tabitabi.pages.dev/og-image.png" />
  <meta name="theme-color" content={backgroundColor} />
</svelte:head>

{#key data.itinerary.theme_id}
  <ItineraryView
    {itinerary}
    {steps}
    onUpdateItinerary={isViewOnly ? undefined : handleUpdateItinerary}
    onCreateStep={isViewOnly ? undefined : handleCreateStep}
    onUpdateStep={isViewOnly ? undefined : handleUpdateStep}
    onDeleteStep={isViewOnly ? undefined : handleDeleteStep}
    onPublishItinerary={isViewOnly ? undefined : handlePublishItinerary}
  />
{/key}

<LazyPrintStudio {itinerary} {steps} />

{#if isViewOnly}
  <aside class="shared-snapshot-cta" aria-label="共有されたしおりの操作">
    <div>
      <p class="shared-snapshot-eyebrow">共有されたしおり</p>
      <p class="shared-snapshot-copy">閲覧専用です。コピーすると自分用に編集できます。</p>
    </div>
    <button
      onclick={handleFork}
      disabled={forking}
      class="shared-snapshot-button"
    >
      {forking ? "コピー中..." : "コピーして編集"}
    </button>
  </aside>
{/if}

<style>
  .shared-snapshot-cta {
    position: fixed;
    right: max(1rem, env(safe-area-inset-right));
    bottom: max(1rem, env(safe-area-inset-bottom));
    z-index: 60;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    max-width: min(32rem, calc(100vw - 2rem));
    padding: 0.75rem 0.8rem 0.75rem 1rem;
    border: 1px solid #dbeafe;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 12px 32px rgba(30, 64, 175, 0.18);
    backdrop-filter: blur(10px);
  }
  .shared-snapshot-eyebrow { margin: 0 0 0.15rem; color: #1d4ed8; font-size: 0.75rem; font-weight: 700; }
  .shared-snapshot-copy { margin: 0; color: #334155; font-size: 0.78rem; line-height: 1.35; }
  .shared-snapshot-button { flex: none; border: 0; border-radius: 0.7rem; padding: 0.7rem 0.85rem; background: #2563eb; color: white; font-size: 0.82rem; font-weight: 700; white-space: nowrap; cursor: pointer; }
  .shared-snapshot-button:hover { background: #1d4ed8; }
  .shared-snapshot-button:disabled { cursor: wait; opacity: 0.65; }
  @media (max-width: 540px) { .shared-snapshot-cta { left: 1rem; right: 1rem; } }
</style>
