<script lang="ts">
  import { prefectures, travelTags } from "$lib/explore/data";
  import PrefectureSelector from "$lib/features/prefecture/PrefectureSelector.svelte";

  interface Props {
    selectedPrefectures: string[];
    areas: string[];
    tags: string[];
  }

  let {
    selectedPrefectures = $bindable(),
    areas = $bindable(),
    tags = $bindable(),
  }: Props = $props();

  const prefectureOptions = prefectures.map((item) => ({ value: item.slug, label: item.name, region: item.region }));
  let areaInput = $state("");

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
</script>

<div class="metadata-fields">
  <section>
    <div class="heading"><span>旅行先</span><span>3件まで</span></div>
    <PrefectureSelector
      options={prefectureOptions}
      selectedValues={selectedPrefectures}
      max={3}
      placeholder="旅行先の都道府県を選ぶ"
      ariaLabel="旅行先の都道府県"
      onChange={(values) => (selectedPrefectures = values)}
    />
  </section>

  <section>
    <div class="heading"><label for="metadata-area">エリア</label><span>任意・3件まで</span></div>
    {#if areas.length}<div class="chips optional">{#each areas as area}<button type="button" onclick={() => (areas = areas.filter((value) => value !== area))}>{area}<span>×</span></button>{/each}</div>{/if}
    <div class="add-row"><input id="metadata-area" bind:value={areaInput} maxlength="16" placeholder="例：嵐山、箱根" onkeydown={(event) => event.key === "Enter" && (event.preventDefault(), addArea())} /><button type="button" onclick={addArea} disabled={!areaInput.trim() || areas.length >= 3}>追加</button></div>
  </section>

  <section>
    <div class="heading"><span>旅のタグ</span><span>任意・3件まで</span></div>
    <div class="tags">{#each travelTags as tag}<button type="button" class:selected={tags.includes(tag)} onclick={() => toggleTag(tag)}>{tag}</button>{/each}</div>
  </section>
</div>

<style>
  .metadata-fields { display: grid; gap: 1rem; }
  section { padding-top: .85rem; border-top: 1px solid var(--theme-border, #e5e7eb); }
  section:first-child { padding-top: 0; border-top: 0; }
  .heading { display: flex; margin-bottom: .55rem; justify-content: space-between; gap: .5rem; color: var(--theme-text, #334155); font-size: .82rem; font-weight: 750; }
  .heading > span:last-child { color: var(--theme-text-light, #64748b); font-size: .68rem; font-weight: 500; }
  .chips, .tags { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .55rem; }
  .chips button, .tags button { border-radius: 999px; padding: .42rem .6rem; font: inherit; font-size: .7rem; cursor: pointer; }
  .chips button { border: 0; color: white; background: var(--theme-primary, #6478b8); font-weight: 700; }
  .chips.optional button { color: var(--theme-text, #334155); background: color-mix(in srgb, var(--theme-primary, #6478b8) 13%, white); }
  .chips button span { margin-left: .3rem; opacity: .65; }
  .add-row { display: grid; grid-template-columns: 1fr auto; gap: .45rem; }
  .add-row input { min-width: 0; height: 2.55rem; box-sizing: border-box; padding: 0 .7rem; border: 1px solid var(--theme-border, #dbe1e8); border-radius: .65rem; color: var(--theme-text, #334155); background: white; font: inherit; font-size: .82rem; }
  .add-row button { border: 0; border-radius: .65rem; padding: 0 .8rem; color: var(--theme-primary, #6478b8); background: color-mix(in srgb, var(--theme-primary, #6478b8) 12%, white); font-weight: 800; cursor: pointer; }
  .add-row button:disabled { opacity: .4; cursor: default; }
  .tags button { border: 1px solid var(--theme-border, #dbe1e8); color: var(--theme-text-light, #64748b); background: white; }
  .tags button.selected { border-color: var(--theme-primary, #6478b8); color: white; background: var(--theme-primary, #6478b8); }
  @media (max-width: 600px) { .add-row input { font-size: 16px; } }
</style>