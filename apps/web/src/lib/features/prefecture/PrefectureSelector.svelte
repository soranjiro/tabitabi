<script lang="ts">
  import { regions, type RegionName } from "$lib/explore/data";

  export interface PrefectureOption {
    value: string;
    label: string;
    region: RegionName;
  }

  interface Props {
    options: PrefectureOption[];
    selectedValues: string[];
    max?: number;
    placeholder?: string;
    ariaLabel?: string;
    onChange: (values: string[]) => void;
  }

  let {
    options,
    selectedValues,
    max = 1,
    placeholder = "都道府県を選ぶ",
    ariaLabel = "都道府県を選ぶ",
    onChange,
  }: Props = $props();

  let open = $state(false);
  let query = $state("");

  const selectedOptions = $derived.by(() =>
    selectedValues
      .map((value) => options.find((option) => option.value === value))
      .filter((option): option is PrefectureOption => Boolean(option)),
  );

  const groupedOptions = $derived.by(() => {
    const normalized = query.trim().toLocaleLowerCase("ja-JP");
    return regions
      .map((region) => ({
        region,
        options: options.filter((option) => {
          if (option.region !== region) return false;
          if (!normalized) return true;
          const short = option.label.replace(/[都道府県]$/, "");
          return option.label.toLocaleLowerCase("ja-JP").includes(normalized)
            || short.toLocaleLowerCase("ja-JP").includes(normalized);
        }),
      }))
      .filter((group) => group.options.length > 0);
  });

  function close() {
    open = false;
    query = "";
  }

  function toggle(value: string) {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((item) => item !== value));
      return;
    }

    if (max === 1) {
      onChange([value]);
      close();
      return;
    }

    if (selectedValues.length >= max) return;
    onChange([...selectedValues, value]);
  }
</script>

<div class="prefecture-selector">
  {#if max > 1 && selectedOptions.length}
    <div class="selected-list" aria-label="選択中の都道府県">
      {#each selectedOptions as option}
        <button type="button" onclick={() => toggle(option.value)} aria-label={`${option.label}を選択解除`}>
          {option.label}<span aria-hidden="true">×</span>
        </button>
      {/each}
    </div>
  {/if}

  <button
    type="button"
    class="trigger"
    class:has-selection={selectedOptions.length > 0}
    aria-label={ariaLabel}
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <span>
      {#if selectedOptions.length}
        {selectedOptions.map((option) => option.label).join("、")}
      {:else}
        <em>{placeholder}</em>
      {/if}
    </span>
    <i aria-hidden="true">⌄</i>
  </button>

  {#if open}
    <button type="button" class="backdrop" aria-label="都道府県選択を閉じる" onclick={close}></button>
    <div class="panel" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <div class="panel-header">
        <div>
          <strong>{ariaLabel}</strong>
          <span>{max === 1 ? "1つ選択" : `${selectedValues.length} / ${max}件選択中`}</span>
        </div>
        <button type="button" class="close" onclick={close} aria-label="閉じる">×</button>
      </div>

      <input
        class="search"
        type="search"
        bind:value={query}
        placeholder="都道府県を検索"
        aria-label="都道府県を検索"
        onkeydown={(event) => {
          if (event.key === "Enter") event.preventDefault();
          if (event.key === "Escape") close();
        }}
      />

      <div class="groups">
        {#each groupedOptions as group}
          <section>
            <h4>{group.region}</h4>
            <div class="option-grid">
              {#each group.options as option}
                {@const selected = selectedValues.includes(option.value)}
                <button
                  type="button"
                  class:selected
                  aria-pressed={selected}
                  disabled={!selected && selectedValues.length >= max}
                  onclick={() => toggle(option.value)}
                >
                  {option.label}
                </button>
              {/each}
            </div>
          </section>
        {:else}
          <p class="empty">該当する都道府県がありません。</p>
        {/each}
      </div>

      {#if max > 1}
        <div class="panel-footer">
          <span>{selectedValues.length} / {max}件選択中</span>
          <button type="button" onclick={close}>完了</button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .prefecture-selector { position: relative; width: 100%; }
  .trigger { display: flex; width: 100%; min-height: 2.8rem; box-sizing: border-box; padding: .65rem .8rem; border: 1px solid var(--theme-border, #d1d5db); border-radius: .7rem; align-items: center; justify-content: space-between; gap: .75rem; color: var(--theme-text, #334155); background: white; font: inherit; font-size: .84rem; text-align: left; cursor: pointer; }
  .trigger:hover { border-color: color-mix(in srgb, var(--theme-primary, #6366f1) 55%, var(--theme-border, #d1d5db)); }
  .trigger:focus-visible { outline: 2px solid var(--theme-primary, #6366f1); outline-offset: 2px; }
  .trigger span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .trigger em { color: var(--theme-text-light, #6b7280); font-style: normal; }
  .trigger i { flex: 0 0 auto; color: var(--theme-text-light, #6b7280); font-size: 1rem; font-style: normal; transition: transform .16s ease; }
  .trigger[aria-expanded="true"] i { transform: rotate(180deg); }
  .selected-list { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: .5rem; }
  .selected-list button { min-height: 2rem; padding: .4rem .6rem; border: 0; border-radius: 999px; color: white; background: var(--theme-primary, #6366f1); font: inherit; font-size: .72rem; font-weight: 750; cursor: pointer; }
  .selected-list span { margin-left: .35rem; opacity: .7; }
  .backdrop { position: fixed; z-index: 1090; inset: 0; border: 0; padding: 0; background: transparent; cursor: default; }
  .panel { position: absolute; z-index: 1100; top: calc(100% + .45rem); left: 0; width: 100%; max-height: min(28rem, calc(100vh - 5rem)); box-sizing: border-box; overflow: hidden; border: 1px solid var(--theme-border, #dbe1e8); border-radius: .9rem; color: var(--theme-text, #334155); background: white; box-shadow: 0 18px 48px rgba(35, 48, 73, .18); }
  .panel-header { display: flex; padding: .85rem .9rem .65rem; align-items: center; justify-content: space-between; gap: .75rem; }
  .panel-header > div { display: grid; gap: .12rem; }
  .panel-header strong { font-size: .88rem; }
  .panel-header span { color: var(--theme-text-light, #64748b); font-size: .68rem; }
  .close { display: grid; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; border: 0; border-radius: 50%; place-items: center; color: var(--theme-text-light, #64748b); background: #f1f5f9; font: inherit; font-size: 1.1rem; cursor: pointer; }
  .search { display: block; width: calc(100% - 1.8rem); height: 2.75rem; box-sizing: border-box; margin: 0 .9rem .65rem; padding: 0 .8rem; border: 1px solid var(--theme-border, #dbe1e8); border-radius: .65rem; color: var(--theme-text, #334155); background: #f8fafc; font: inherit; font-size: 16px; }
  .search:focus { outline: 2px solid var(--theme-primary, #6366f1); outline-offset: 1px; }
  .groups { max-height: 18.5rem; overflow-y: auto; padding: 0 .9rem .8rem; overscroll-behavior: contain; }
  section + section { margin-top: .85rem; }
  h4 { margin: 0 0 .4rem; color: var(--theme-text-light, #64748b); font-size: .68rem; font-weight: 800; letter-spacing: .04em; }
  .option-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .4rem; }
  .option-grid button { min-height: 2.75rem; padding: .45rem .3rem; border: 1px solid var(--theme-border, #dbe1e8); border-radius: .6rem; color: var(--theme-text, #334155); background: white; font: inherit; font-size: .75rem; font-weight: 650; cursor: pointer; }
  .option-grid button:hover:not(:disabled) { border-color: var(--theme-primary, #6366f1); background: color-mix(in srgb, var(--theme-primary, #6366f1) 7%, white); }
  .option-grid button.selected { border-color: var(--theme-primary, #6366f1); color: white; background: var(--theme-primary, #6366f1); }
  .option-grid button:focus-visible, .close:focus-visible, .panel-footer button:focus-visible { outline: 2px solid var(--theme-primary, #6366f1); outline-offset: 2px; }
  .option-grid button:disabled { cursor: default; opacity: .38; }
  .empty { margin: 1.2rem 0; color: var(--theme-text-light, #64748b); font-size: .78rem; text-align: center; }
  .panel-footer { display: flex; padding: .7rem .9rem; border-top: 1px solid var(--theme-border, #e5e7eb); align-items: center; justify-content: space-between; gap: .75rem; background: #fff; }
  .panel-footer span { color: var(--theme-text-light, #64748b); font-size: .72rem; }
  .panel-footer button { min-width: 5.5rem; min-height: 2.6rem; border: 0; border-radius: .65rem; color: white; background: var(--theme-primary, #6366f1); font: inherit; font-size: .78rem; font-weight: 800; cursor: pointer; }

  @media (max-width: 640px) {
    .backdrop { background: rgba(30, 41, 59, .35); backdrop-filter: blur(2px); }
    .panel { position: fixed; top: auto; right: 0; bottom: 0; left: 0; width: 100%; max-height: min(82vh, 42rem); border-width: 1px 0 0; border-radius: 1.05rem 1.05rem 0 0; box-shadow: 0 -16px 48px rgba(30, 41, 59, .22); padding-bottom: env(safe-area-inset-bottom); }
    .panel-header { padding-top: 1rem; }
    .groups { max-height: calc(82vh - 10.5rem); }
    .option-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .45rem; }
    .option-grid button { min-height: 3rem; font-size: .78rem; }
    .panel-footer { padding-bottom: max(.7rem, env(safe-area-inset-bottom)); }
  }
</style>
