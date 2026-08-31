<script lang="ts">
  import { page } from "$app/stores";
  import { invalidateAll } from "$app/navigation";
  import { backgroundApi } from "$lib/api/background";
  import { ITINERARY_BACKGROUND_PRESETS } from "$lib/itinerary-backgrounds";
  import type { ItineraryResponse } from "@tabitabi/types";

  let open = $state(false);
  let busy = $state(false);
  let error = $state("");
  let current = $state<string | null>(null);
  let loadedId = $state<string | null>(null);

  const itinerary = $derived(($page.data?.itinerary ?? null) as ItineraryResponse | null);
  const isItineraryPage = $derived(Boolean(itinerary?.id));
  const canConfigure = $derived(Boolean(itinerary?.id && !itinerary?.source_itinerary_id));

  $effect(() => {
    const id = itinerary?.id;
    if (!id || loadedId === id) return;
    loadedId = id;
    void loadBackground(id);
  });

  $effect(() => {
    if (typeof document === "undefined") return;
    if (isItineraryPage && current) {
      document.documentElement.dataset.itineraryCover = "true";
      document.documentElement.style.setProperty("--itinerary-cover-image", `url("${current}")`);
    } else {
      delete document.documentElement.dataset.itineraryCover;
      document.documentElement.style.removeProperty("--itinerary-cover-image");
    }
  });

  async function loadBackground(id: string) {
    try {
      current = (await backgroundApi.get(id)).background_image;
    } catch {
      current = null;
    }
  }

  async function selectBackground(value: string | null) {
    if (!itinerary?.id || busy) return;
    busy = true;
    error = "";
    try {
      current = (await backgroundApi.update(itinerary.id, value)).background_image;
      open = false;
      await invalidateAll();
    } catch {
      error = "背景画像を変更できませんでした。編集権限を確認してください。";
    } finally {
      busy = false;
    }
  }
</script>

{#if canConfigure}
  <button class="background-trigger" type="button" onclick={() => (open = true)} aria-label="しおりの背景画像を選ぶ">
    <span aria-hidden="true">▧</span> 背景
  </button>
{/if}

{#if open && itinerary}
  <div class="backdrop" role="presentation" onclick={(event) => event.currentTarget === event.target && (open = false)}>
    <section class="picker" role="dialog" aria-modal="true" aria-labelledby="background-picker-title">
      <header>
        <div>
          <p>DESIGN</p>
          <h2 id="background-picker-title">背景画像を選ぶ</h2>
        </div>
        <button type="button" class="close" onclick={() => (open = false)} aria-label="閉じる">×</button>
      </header>
      <p class="intro">旅の風景をテーマにした10種類から選べます。画像はタイトル部分のカバーとして表示されます。</p>

      <div class="grid">
        <button class:selected={current === null} type="button" onclick={() => selectBackground(null)} disabled={busy}>
          <span class="none-preview">背景なし</span>
          <strong>背景なし</strong>
        </button>
        {#each ITINERARY_BACKGROUND_PRESETS as preset}
          <button class:selected={current === preset.url} type="button" onclick={() => selectBackground(preset.url)} disabled={busy}>
            <img src={preset.url} alt="" />
            <strong>{preset.name}</strong>
          </button>
        {/each}
      </div>

      <p class="future">将来の写真アップロードにも同じ背景フィールドを使える構成にしています。</p>
      {#if error}<p class="error" role="alert">{error}</p>{/if}
    </section>
  </div>
{/if}

<style>
  .background-trigger {
    position: fixed;
    z-index: 54;
    top: 76px;
    right: 16px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 13px;
    border: 1px solid rgba(255,255,255,.7);
    border-radius: 999px;
    color: #344760;
    background: rgba(255,255,255,.92);
    box-shadow: 0 8px 24px rgba(38,55,80,.14);
    backdrop-filter: blur(10px);
    font: inherit;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
  }
  .backdrop { position: fixed; z-index: 120; inset: 0; display: grid; place-items: center; padding: 20px; background: rgba(24,35,52,.48); }
  .picker { width: min(720px, 100%); max-height: min(760px, 90dvh); overflow: auto; padding: 24px; border-radius: 22px; background: #fff; box-shadow: 0 24px 70px rgba(22,32,48,.3); }
  header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
  header p { margin: 0 0 3px; color: #6c88c4; font-size: 9px; font-weight: 900; letter-spacing: .18em; }
  h2 { margin: 0; color: #263852; font-size: 24px; }
  .close { border: 0; color: #738096; background: transparent; font-size: 28px; cursor: pointer; }
  .intro, .future { color: #748096; font-size: 12px; line-height: 1.7; }
  .intro { margin: 12px 0 18px; }
  .future { margin: 18px 0 0; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .grid button { overflow: hidden; padding: 0 0 9px; border: 2px solid transparent; border-radius: 13px; color: #40516b; background: #f5f7fb; font: inherit; font-size: 11px; cursor: pointer; }
  .grid button.selected { border-color: #5a7dca; box-shadow: 0 0 0 2px rgba(90,125,202,.12); }
  .grid button:disabled { cursor: wait; opacity: .65; }
  img, .none-preview { display: grid; width: 100%; height: 82px; object-fit: cover; place-items: center; margin-bottom: 8px; background: linear-gradient(135deg,#f0f3f8,#e4e9f2); color: #8994a6; font-size: 11px; }
  .error { margin: 12px 0 0; color: #b4233b; font-size: 12px; }
  @media (max-width: 600px) {
    .background-trigger { top: 68px; right: 10px; }
    .picker { padding: 18px; }
    .grid { grid-template-columns: repeat(2, 1fr); }
  }
</style>
