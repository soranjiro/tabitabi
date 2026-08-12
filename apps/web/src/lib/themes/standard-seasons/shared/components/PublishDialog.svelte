<script lang="ts">
  import Dialog from "./Dialog.svelte";
  import { prefectures, travelTags } from "$lib/explore/data";

  export interface PublishMetadata {
    prefectureSlugs: string[];
    areas: string[];
    tags: string[];
  }

  interface Props {
    show: boolean;
    isLoggedIn: boolean;
    sourceText?: string;
    onLogin: () => void;
    onPublish: (metadata: PublishMetadata) => Promise<string>;
    onClose: () => void;
  }

  let { show, isLoggedIn, sourceText = "", onLogin, onPublish, onClose }: Props = $props();
  let selectedPrefectures = $state<string[]>([]);
  let prefectureCandidate = $state("");
  let areas = $state<string[]>([]);
  let areaInput = $state("");
  let tags = $state<string[]>([]);
  let publishing = $state(false);
  let publishedId = $state("");
  let validationMessage = $state("");
  let initialized = $state(false);

  $effect(() => {
    if (!show) {
      initialized = false;
      return;
    }
    if (initialized || selectedPrefectures.length) return;
    initialized = true;
    const suggestions = prefectures.filter((item) => {
      const short = item.name.replace(/[都道府県]$/, "");
      return sourceText.includes(item.name) || (short.length >= 2 && sourceText.includes(short));
    }).slice(0, 3);
    selectedPrefectures = suggestions.map((item) => item.slug);
  });

  function addPrefecture() {
    if (!prefectureCandidate || selectedPrefectures.includes(prefectureCandidate) || selectedPrefectures.length >= 3) return;
    selectedPrefectures = [...selectedPrefectures, prefectureCandidate];
    prefectureCandidate = "";
    validationMessage = "";
  }

  function removePrefecture(slug: string) {
    selectedPrefectures = selectedPrefectures.filter((item) => item !== slug);
  }

  function addArea() {
    const value = areaInput.trim();
    if (!value || areas.includes(value) || areas.length >= 3) return;
    areas = [...areas, value];
    areaInput = "";
  }

  function toggleTag(tag: string) {
    if (tags.includes(tag)) tags = tags.filter((item) => item !== tag);
    else if (tags.length < 3) tags = [...tags, tag];
  }

  async function publish() {
    if (!selectedPrefectures.length) {
      validationMessage = "旅行先を1件以上選んでください";
      return;
    }
    if (publishing) return;
    publishing = true;
    validationMessage = "";
    try {
      publishedId = await onPublish({ prefectureSlugs: selectedPrefectures, areas, tags });
    } catch {
      validationMessage = "公開できませんでした。時間をおいてもう一度お試しください";
    } finally {
      publishing = false;
    }
  }
</script>

<Dialog {show} title={publishedId ? "公開しました" : "しおりを公開"} {onClose}>
  {#snippet children()}
    {#if publishedId}
      <div class="publish-success">
        <span aria-hidden="true">✓</span>
        <p>みんなのしおりと、選んだ旅行先のページに掲載されました。</p>
        <a href="/itineraries/{publishedId}">公開ページを見る</a>
        <button type="button" onclick={onClose}>閉じる</button>
      </div>
    {:else if !isLoggedIn}
      <div class="account-required">
        <span aria-hidden="true">✈</span>
        <h4>公開にはアカウントが必要です</h4>
        <p>公開したしおりの管理や、コピー数の確認ができるようになります。URLで仲間に共有するだけなら登録は不要です。</p>
        <button type="button" onclick={onLogin}>ログイン・無料登録へ</button>
        <button type="button" class="text-button" onclick={onClose}>今はしない</button>
      </div>
    {:else}
      <p class="publish-intro">公開に必要なのは旅行先だけ。エリアやテーマは、探しやすくしたいときだけ追加できます。</p>

      <section class="field-section">
        <div class="field-heading"><label for="publish-prefecture">旅行先</label><strong>必須 · 3件まで</strong></div>
        {#if selectedPrefectures.length}
          <div class="selected-chips">{#each selectedPrefectures as slug}{@const item = prefectures.find((prefecture) => prefecture.slug === slug)}{#if item}<button type="button" onclick={() => removePrefecture(slug)}>{item.name}<span>×</span></button>{/if}{/each}</div>
        {/if}
        <div class="add-row">
          <select id="publish-prefecture" bind:value={prefectureCandidate}>
            <option value="">都道府県を選ぶ</option>
            {#each prefectures.filter((item) => !selectedPrefectures.includes(item.slug)) as item}<option value={item.slug}>{item.name}</option>{/each}
          </select>
          <button type="button" onclick={addPrefecture} disabled={!prefectureCandidate || selectedPrefectures.length >= 3}>追加</button>
        </div>
      </section>

      <section class="field-section">
        <div class="field-heading"><label for="publish-area">エリア</label><span>任意 · 3件まで</span></div>
        <p class="hint">例：嵐山、箱根、別府温泉</p>
        {#if areas.length}<div class="selected-chips optional">{#each areas as area}<button type="button" onclick={() => (areas = areas.filter((item) => item !== area))}>{area}<span>×</span></button>{/each}</div>{/if}
        <div class="add-row"><input id="publish-area" bind:value={areaInput} maxlength="16" placeholder="エリア名を入力" onkeydown={(event) => event.key === "Enter" && (event.preventDefault(), addArea())} /><button type="button" onclick={addArea} disabled={!areaInput.trim() || areas.length >= 3}>追加</button></div>
      </section>

      <section class="field-section">
        <div class="field-heading"><span>旅のテーマ</span><span>任意 · 3件まで</span></div>
        <div class="tag-options">{#each travelTags as tag}<button type="button" class:selected={tags.includes(tag)} onclick={() => toggleTag(tag)}>{tag}</button>{/each}</div>
      </section>

      <p class="privacy-check">公開前に、旅程やメモに個人情報が含まれていないか確認してください。</p>
      {#if validationMessage}<p class="validation" role="alert">{validationMessage}</p>{/if}
      <button type="button" class="publish-button" onclick={publish} disabled={publishing}>{publishing ? "公開しています…" : "みんなに公開する"}</button>
      <button type="button" class="cancel-button" onclick={onClose}>キャンセル</button>
    {/if}
  {/snippet}
</Dialog>

<style>
  .publish-intro { margin: 0 0 1.1rem; color: var(--theme-text-light); font-size: .82rem; line-height: 1.65; text-align: center; }
  .field-section { padding: .95rem 0; border-top: 1px solid var(--theme-border); }
  .field-heading { display: flex; margin-bottom: .55rem; align-items: center; justify-content: space-between; gap: .5rem; color: var(--theme-text); font-size: .83rem; font-weight: 700; }
  .field-heading strong { padding: .2rem .4rem; border-radius: 999px; color: white; background: var(--theme-primary); font-size: .63rem; }
  .field-heading > span:last-child { color: var(--theme-text-light); font-size: .68rem; font-weight: 500; }
  .hint { margin: -.25rem 0 .6rem; color: var(--theme-text-light); font-size: .68rem; }
  .selected-chips, .tag-options { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .6rem; }
  .selected-chips button { padding: .42rem .58rem; border: 0; border-radius: 999px; color: white; background: var(--theme-primary); font: inherit; font-size: .72rem; font-weight: 700; cursor: pointer; }
  .selected-chips.optional button { color: var(--theme-text); background: color-mix(in srgb, var(--theme-primary) 13%, white); }
  .selected-chips span { margin-left: .3rem; opacity: .65; }
  .add-row { display: grid; grid-template-columns: 1fr auto; gap: .45rem; }
  .add-row select, .add-row input { min-width: 0; height: 2.55rem; box-sizing: border-box; padding: 0 .75rem; border: 1px solid var(--theme-border); border-radius: .65rem; color: var(--theme-text); background: white; font: inherit; font-size: .82rem; }
  .add-row button { padding: 0 .8rem; border: 0; border-radius: .65rem; color: var(--theme-primary); background: color-mix(in srgb, var(--theme-primary) 12%, white); font-weight: 800; cursor: pointer; }
  .add-row button:disabled { cursor: default; opacity: .4; }
  .tag-options button { padding: .42rem .62rem; border: 1px solid var(--theme-border); border-radius: 999px; color: var(--theme-text-light); background: white; font: inherit; font-size: .7rem; cursor: pointer; }
  .tag-options button.selected { border-color: var(--theme-primary); color: white; background: var(--theme-primary); }
  .privacy-check { margin: .5rem 0 .7rem; padding: .7rem; border-radius: .65rem; color: var(--theme-text-light); background: color-mix(in srgb, var(--theme-secondary) 13%, white); font-size: .69rem; line-height: 1.55; }
  .validation { margin: 0 0 .6rem; color: #c2413c; font-size: .72rem; text-align: center; }
  .publish-button, .cancel-button, .account-required button, .publish-success a, .publish-success button { width: 100%; border: 0; border-radius: .75rem; padding: .8rem; box-sizing: border-box; font: inherit; font-size: .82rem; font-weight: 800; cursor: pointer; }
  .publish-button, .account-required > button:not(.text-button), .publish-success a { color: white; background: var(--theme-primary); }
  .cancel-button, .account-required .text-button, .publish-success button { margin-top: .3rem; color: var(--theme-text-light); background: transparent; }
  .publish-button:disabled { cursor: wait; opacity: .55; }
  .account-required, .publish-success { padding: .2rem 0 1rem; text-align: center; }
  .account-required > span, .publish-success > span { display: grid; width: 3.3rem; height: 3.3rem; margin: 0 auto 1rem; place-items: center; border-radius: 50%; color: var(--theme-primary); background: color-mix(in srgb, var(--theme-primary) 12%, white); font-size: 1.35rem; }
  .account-required h4 { margin: 0 0 .55rem; color: var(--theme-text); font-size: 1rem; }
  .account-required p, .publish-success p { margin: 0 0 1.2rem; color: var(--theme-text-light); font-size: .78rem; line-height: 1.7; }
  .publish-success a { display: block; text-decoration: none; }
  @media (max-width: 600px) { .add-row select, .add-row input { font-size: 16px; } }
</style>
