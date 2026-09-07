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
  import { getPalette } from "$lib/themes";
  import SharedBook from '$lib/sharing/SharedBook.svelte';
  import PublishDialog from '$lib/themes/standard/core/components/PublishDialog.svelte';
  let showPublish = $state(false);
  let loggedInForPublish = $state(false);
  let copiedNotice = $state(false);

  let { data } = $props();

  let ItineraryView = $derived(data.theme.components.ItineraryView);
  let backgroundColor = $derived(
    getPalette(data.itinerary.palette_id).colors["--theme-bg"] || data.theme.ui.customColors?.background || "#f9fafb",
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

  function applyPaletteCssVars(paletteId?: string) {
    for (const [key, value] of Object.entries(getPalette(paletteId).colors)) {
      document.documentElement.style.setProperty(key, value);
    }
  }

  $effect(() => {
    if (data.theme) {
      applyThemeCssVars(data.theme);
      applyPaletteCssVars(data.itinerary.palette_id);
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
      // 公開スナップショットは最近のしおり・アカウント同期の対象にしない。
      if (!data.itinerary.source_itinerary_id) {
        // Record password protection state for client-side header resolution
        auth.setPasswordProtected(
          data.itinerary.id,
          data.itinerary.is_password_protected,
        );
        auth.updateAccessTime(data.itinerary.id, data.itinerary.title);
      }
      document.body.style.backgroundColor = backgroundColor;
      document.documentElement.style.backgroundColor = backgroundColor;

      // 開いた通常しおりは、ログイン中のアカウントにも保存する。
      // 公開スナップショットは閲覧専用のため紐付けない。
      if (!data.itinerary.source_itinerary_id && userAuth.isLoggedIn()) {
        try {
          await userApi.syncBookmarks([data.itinerary.id]);
        } catch {
          // 保存に失敗しても閲覧は継続する。次回のログイン同期で再試行される。
        }
      }

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

    void init();
    const params = new URLSearchParams(window.location.search);
    if (!data.itinerary.source_itinerary_id && params.get('publish') === '1') {
      loggedInForPublish = userAuth.isLoggedIn(); showPublish = true;
      window.history.replaceState({}, '', window.location.pathname);
    }
    copiedNotice = params.get('copied') === '1';
    const noticeTimer = setTimeout(() => copiedNotice = false, 4000);

    return () => {
      clearTimeout(noticeTimer);
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
    palette_id?: string;
    packing_enabled?: boolean;
    prefecture_slugs?: string[];
    areas?: string[];
    tags?: string[];
    metadata_initialized?: boolean;
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
      location?: string | null;
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

{#if isViewOnly}
  <SharedBook content={{ itinerary: data.itinerary, steps: data.steps }} />
{:else}
  <div class="book-tools"><a href="/profile">旅の本棚</a><button onclick={() => { loggedInForPublish = userAuth.isLoggedIn(); showPublish = true; }}>共有</button></div>
  {#if copiedNotice}<p class="copy-notice" role="status">✓ 自分のしおりを作りました</p>{/if}
  <PublishDialog show={showPublish} itineraryId={data.itinerary.id} isLoggedIn={loggedInForPublish}
    sourceText={data.itinerary.title}
    initialMetadata={{ prefectureSlugs: data.itinerary.prefecture_slugs ?? [], areas: data.itinerary.areas ?? [], tags: data.itinerary.tags ?? [] }}
    onLogin={() => { sessionStorage.setItem('tabitabi_pending_publish', data.itinerary.id); void goto('/profile'); }}
    onPublish={handlePublishItinerary} onClose={() => showPublish = false} />

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
{/if}


<style>
  .book-tools { display: flex; justify-content: space-between; padding: .5rem 1rem; background: #faf9f5; font-size: .75rem; color: #526455; }
  .book-tools button { border: 0; background: transparent; color: inherit; cursor: pointer; }
  .copy-notice { position: fixed; z-index: 3000; top: 3rem; left: 50%; transform: translateX(-50%); padding: .8rem 1rem; background: #355f50; color: white; border-radius: .5rem; font-size: .8rem; }
</style>
