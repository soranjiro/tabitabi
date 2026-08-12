<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { userApi } from "$lib/api/user";
  import type { PublicBookmark, PublicFeedItem } from "@tabitabi/types";
  import ItineraryCard from "$lib/explore/ItineraryCard.svelte";
  import PublicFooter from "$lib/explore/PublicFooter.svelte";
  import PublicHeader from "$lib/explore/PublicHeader.svelte";

  const username = $derived($page.params.username);

  let bookmarks: PublicBookmark[] = $state([]);
  let loading = $state(true);
  let notFound = $state(false);

  const profileItems = $derived(bookmarks.map((bookmark) => ({
    ...bookmark,
    username,
  }) satisfies PublicFeedItem));

  onMount(async () => {
    if (!username) {
      notFound = true;
      loading = false;
      return;
    }
    try {
      const result = await userApi.getPublicBookmarks(username);
      bookmarks = result.bookmarks;
    } catch (e) {
      notFound = true;
    } finally {
      loading = false;
    }
  });

</script>

<svelte:head>
  <title>@{username} - たびたび</title>
</svelte:head>

<div class="profile-page">
  <PublicHeader />
  <main>
    <a class="back" href="/explore">← みんなのしおり</a>
    <section class="profile-hero">
      <p>TRAVELER PROFILE</p>
      <h1>{notFound ? "ユーザーが見つかりません" : `@${username}`}</h1>
      {#if !loading && !notFound}<span>公開しおり {bookmarks.length}件</span>{/if}
    </section>

    <section aria-label="公開しおり">
      {#if loading}
        <div class="state">読み込み中...</div>
      {:else if notFound}
        <div class="state">ユーザーが見つかりませんでした。<a href="/explore">一覧へ戻る</a></div>
      {:else if bookmarks.length === 0}
        <div class="state">公開されているしおりはありません</div>
      {:else}
        <div class="cards">
          {#each profileItems as itinerary}<ItineraryCard {itinerary} />{/each}
        </div>
      {/if}
    </section>
  </main>
  <PublicFooter />
</div>

<style>
  :global(body) { margin: 0; color: #27364f; background: #fbfcff; }
  .profile-page { min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif; }
  main { width: min(1080px, calc(100% - 40px)); margin: 0 auto; padding: 36px 0 76px; }
  .back { color: #5b78b3; font-size: 12px; font-weight: 700; text-decoration: none; }
  .profile-hero { margin: 18px 0 32px; padding: 34px; border: 1px solid #dfe8f7; border-radius: 20px; background: linear-gradient(135deg, #edf6ff, #f0efff); }
  .profile-hero p { margin: 0 0 7px; color: #7696d3; font-size: 10px; font-weight: 900; letter-spacing: .18em; }
  .profile-hero h1 { margin: 0; color: #263858; font-size: clamp(28px, 5vw, 40px); }
  .profile-hero span { display: block; margin-top: 10px; color: #748098; font-size: 13px; }
  .cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
  .state { padding: 48px 20px; border-radius: 15px; color: #7d899c; background: #f4f7fc; text-align: center; font-size: 13px; }
  .state a { margin-left: .35rem; color: #4d71cb; font-weight: 800; }
  @media (max-width: 800px) { .cards { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px) { main { width: calc(100% - 28px); padding: 24px 0 54px; } .profile-hero { padding: 25px 22px; } .cards { grid-template-columns: 1fr; } }
</style>
