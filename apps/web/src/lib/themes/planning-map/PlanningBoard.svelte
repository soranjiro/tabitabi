<script lang="ts">
  import type { Step } from '@tabitabi/types';
  import { getMemoText } from '$lib/memo';
  import { getPlace, type Place } from '$lib/planning/places';
  import { getStepSchedule } from '$lib/planning/schedule';
  import PlaceMap from './PlaceMap.svelte';

  let { steps, canEdit, onCreate, onEdit, onPreview }: {
    steps: Step[];
    canEdit: boolean;
    onCreate: (place?: Place) => void;
    onEdit: (step: Step) => void;
    onPreview: () => void;
  } = $props();

  let selected = $state<string | null>(null);
  let query = $state('');
  let filter = $state<'all' | 'idea' | 'priority'>('all');
  const numbers = $derived(Object.fromEntries(steps.map((step, index) => [step.id, index + 1])));
  const candidateCount = $derived(steps.filter((step) => getStepSchedule(step).precision === 'undecided').length);
  const selectedStep = $derived(steps.find((step) => step.id === selected));
  const visible = $derived(steps.filter((step) => {
    const schedule = getStepSchedule(step);
    const matchesFilter = filter === 'all'
      || (filter === 'idea' && schedule.precision === 'undecided')
      || (filter === 'priority' && getPlace(step.notes)?.priority);
    return matchesFilter && `${step.title} ${step.location || ''} ${getMemoText(step.notes)}`.toLowerCase().includes(query.toLowerCase());
  }));
</script>

<section class="board-header">
  <div><h2>地図から予定を決める</h2><p>{steps.length}件の候補 · {candidateCount}件は日程未定</p></div>
  <div class="header-actions">
    <button class="preview" onclick={onPreview}>旅程を見る</button>
    {#if canEdit}<button class="add-place" onclick={() => onCreate()}>＋ 場所を追加</button>{/if}
  </div>
</section>

<div class="workspace">
  <aside class="ideas" aria-label="行きたい場所">
    <label class="search"><span aria-hidden="true">⌕</span><input aria-label="候補を検索" placeholder="候補を検索" bind:value={query} /></label>
    <div class="filters" aria-label="候補の絞り込み">
      <button class:active={filter === 'all'} onclick={() => filter = 'all'}>すべて</button>
      <button class:active={filter === 'idea'} onclick={() => filter = 'idea'}>日程未定 {candidateCount}</button>
      <button class:active={filter === 'priority'} onclick={() => filter = 'priority'}>★ 優先</button>
    </div>
    <div class="cards">
      {#each visible as step}
        {@const place = getPlace(step.notes)}
        {@const schedule = getStepSchedule(step)}
        <article class:selected={selected === step.id}>
          <button class="idea" onclick={() => canEdit ? onEdit(step) : selected = step.id} onmouseenter={() => selected = step.id} onfocus={() => selected = step.id} aria-label={canEdit ? `${step.title}を編集` : step.title}>
            <span class="number">{steps.indexOf(step) + 1}</span>
            <span class="content">
              <span class="topline"><span>{schedule.precision === 'undecided' ? '日程未定' : schedule.day ? `Day ${schedule.day}` : '日時設定済み'}</span>{#if place?.priority}<span class="priority">★ 優先</span>{/if}</span>
              <strong>{step.title}</strong>
              {#if getMemoText(step.notes)}<span class="memo">{getMemoText(step.notes)}</span>{/if}
              <span class="location">{step.location || (place ? '地図にピンあり' : '場所未定')}</span>
            </span>
            {#if canEdit}<span class="edit-label">編集</span>{/if}
          </button>
        </article>
      {/each}
      {#if !visible.length}<div class="empty"><strong>{steps.length ? '候補が見つかりません' : '候補はまだありません'}</strong><p>{steps.length ? '検索や絞り込みを変更してください。' : '場所を追加して、地図に並べましょう。'}</p></div>{/if}
    </div>
  </aside>

  <div class="map-column">
    <div class="map-area"><PlaceMap steps={visible} {numbers} {selected} {canEdit} onSelect={(id) => selected = id} onPin={onCreate} /></div>
    {#if selectedStep}
      <section class="map-selection" aria-live="polite">
        <button class="close" onclick={() => selected = null} aria-label="選択を閉じる">×</button>
        <span class="selection-number">{numbers[selectedStep.id]}</span>
        <div><strong>{selectedStep.title}</strong><p>{getMemoText(selectedStep.notes) || selectedStep.location || 'メモはありません'}</p></div>
        {#if canEdit}<button class="selection-edit" onclick={() => onEdit(selectedStep!)}>編集</button>{/if}
      </section>
    {/if}
  </div>
</div>

<style>
  button, input { font: inherit; }
  button { border: 0; color: inherit; background: none; cursor: pointer; }
  .board-header { display: flex; align-items: end; justify-content: space-between; gap: 24px; padding: 28px 0 18px; }
  h2 { margin: 0 0 6px; color: #25342f; font-size: clamp(20px, 2.4vw, 28px); letter-spacing: -.02em; }
  p { margin: 0; color: #748078; font-size: 12px; line-height: 1.65; }
  .header-actions { display: flex; gap: 8px; }
  .header-actions button { min-height: 42px; padding: 0 16px; border-radius: 10px; font-size: 12px; font-weight: 700; white-space: nowrap; }
  .preview { border: 1px solid #d7ddd7; background: #fff; }
  .add-place { color: #fff; background: #35695d; }
  .workspace { display: grid; grid-template-columns: minmax(280px, 360px) minmax(0, 1fr); align-items: start; gap: 20px; }
  .ideas { min-width: 0; padding: 16px; border: 1px solid #e1e4de; border-radius: 16px; background: #fff; }
  .search { display: flex; align-items: center; gap: 8px; padding: 11px 12px; border: 1px solid #e1e4de; border-radius: 10px; background: #f8f8f4; color: #748078; }
  .search input { width: 100%; border: 0; outline: 0; background: transparent; font-size: 13px; }
  .filters { display: flex; gap: 5px; padding: 12px 0; }
  .filters button { padding: 7px 10px; border-radius: 999px; color: #6f7d75; font-size: 11px; }
  .filters button.active { color: #28594d; background: #e7eee8; font-weight: 700; }
  .cards { display: grid; gap: 6px; }
  article { border: 1px solid transparent; border-radius: 12px; }
  article:hover, article.selected { border-color: #cbd9cf; background: #f1f5ef; }
  .idea { display: grid; width: 100%; padding: 13px 10px; grid-template-columns: 26px minmax(0, 1fr) auto; align-items: start; gap: 10px; text-align: left; }
  .number, .selection-number { display: grid; width: 25px; height: 25px; place-items: center; border-radius: 50%; color: #fff; background: #35695d; font-size: 10px; font-weight: 750; }
  .content { display: grid; min-width: 0; gap: 5px; }
  .topline { display: flex; flex-wrap: wrap; gap: 6px; color: #7c887f; font-size: 10px; }
  .priority { color: #986c38; }
  .content strong { color: #26332f; font-size: 14px; line-height: 1.45; overflow-wrap: anywhere; }
  .memo { padding: 8px 9px; border-radius: 7px; color: #56635c; background: #fff; font-size: 11px; line-height: 1.65; white-space: pre-line; overflow-wrap: anywhere; }
  .location { color: #79857d; font-size: 10px; overflow-wrap: anywhere; }
  .edit-label { align-self: center; color: #35695d; font-size: 11px; font-weight: 700; }
  .map-column { position: sticky; top: 68px; min-width: 0; }
  .map-area { height: min(70vh, 680px); min-height: 500px; }
  .map-selection { position: absolute; z-index: 4; right: 14px; bottom: 42px; left: 14px; display: grid; padding: 13px 14px; grid-template-columns: 26px minmax(0, 1fr) auto; align-items: center; gap: 11px; border: 1px solid #dce2dc; border-radius: 12px; background: rgba(255,255,255,.96); box-shadow: 0 8px 26px rgba(35,55,46,.16); backdrop-filter: blur(8px); }
  .map-selection strong { display: block; margin-bottom: 2px; color: #26332f; font-size: 13px; }
  .map-selection p { display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; }
  .selection-edit { min-height: 38px; padding: 0 14px; border-radius: 9px; color: #fff; background: #35695d; font-size: 12px; font-weight: 700; }
  .close { position: absolute; top: -11px; right: -7px; width: 28px; height: 28px; border: 1px solid #dce2dc; border-radius: 50%; background: #fff; color: #68746d; }
  .empty { padding: 30px 12px; text-align: center; }
  .empty strong { font-size: 13px; }
  .empty p { margin-top: 5px; }
  @media (max-width: 760px) {
    .board-header { align-items: stretch; padding: 20px 0 12px; flex-direction: column; gap: 12px; }
    .header-actions { display: grid; grid-template-columns: 1fr 1fr; }
    .workspace { display: flex; flex-direction: column; gap: 12px; }
    .map-column { position: relative; top: auto; width: 100%; order: -1; }
    .map-area { height: 52vh; min-height: 340px; max-height: 480px; }
    .ideas { width: 100%; padding: 12px; }
    .idea { min-height: 76px; padding: 12px 8px; }
    .memo { font-size: 12px; }
    .map-selection { bottom: 34px; }
  }
  @media (max-width: 420px) {
    .map-selection { grid-template-columns: 24px minmax(0, 1fr); }
    .selection-edit { grid-column: 1 / -1; }
  }
</style>
