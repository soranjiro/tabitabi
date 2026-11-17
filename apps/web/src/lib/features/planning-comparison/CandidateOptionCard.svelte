<script lang="ts">
  import type { ComparisonOption } from '@tabitabi/types';

  let {
    option, selected = false, canEdit = false, busy = false, compact = false,
    onSelect, onEdit,
  }: {
    option: ComparisonOption;
    selected?: boolean;
    canEdit?: boolean;
    busy?: boolean;
    compact?: boolean;
    onSelect?: () => void;
    onEdit?: (field?: 'notes' | 'url') => void;
  } = $props();

  let noteOpen = $state(false);
  function price(amount: number, currency: string) {
    try {
      return new Intl.NumberFormat('ja-JP', {
        style: 'currency', currency, maximumFractionDigits: 0,
      }).format(amount);
    } catch { return amount.toLocaleString('ja-JP') + ' ' + currency; }
  }
  function time(value: string) {
    return value ? value.slice(5).replace('T', ' ') : '';
  }
</script>

<article class="option-card" class:chosen={selected} class:compact>
  <div class="option-head">
    {#if canEdit}
      <button type="button" class="pick" class:chosen={selected} aria-pressed={selected}
        aria-label={option.title + (selected ? 'の選択を解除' : 'を選択')}
        disabled={busy} onclick={() => onSelect?.()}>
        <span aria-hidden="true">{selected ? '✓' : ''}</span>
      </button>
    {:else}
      <span class="pick read-only" class:chosen={selected} aria-label={selected ? '選択済み' : '未選択'}>
        <span aria-hidden="true">{selected ? '✓' : ''}</span>
      </span>
    {/if}
    <div class="option-heading">
      <strong>{option.title}</strong>
      {#if option.provider}<small>{option.provider}</small>{/if}
    </div>
    {#if option.amount !== null}
      <strong class="price">{price(option.amount, option.currency)}</strong>
    {/if}
  </div>

  {#if option.start_local || option.end_local || option.from || option.to || option.cancellation}
    <div class="meta">
      {#if option.start_local || option.end_local}
        <span class="meta-item"><span aria-hidden="true">◷</span> {time(option.start_local)}{option.end_local ? ' – ' + time(option.end_local) : ''}</span>
      {/if}
      {#if option.from || option.to}
        <span class="meta-item"><span aria-hidden="true">↗</span> {[option.from, option.to].filter(Boolean).join(' → ')}</span>
      {/if}
      {#if option.cancellation}<span class="meta-item">{option.cancellation}</span>{/if}
    </div>
  {/if}

  {#if option.notes || option.url || canEdit}
    <div class="actions">
      {#if option.notes}
        <button type="button" class="action" aria-expanded={noteOpen}
          onclick={() => noteOpen = !noteOpen}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3.5h7l4 4v13H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Zm7 0v4h4M8.5 12h7M8.5 16h5"/></svg>
          メモ <span aria-hidden="true">{noteOpen ? '⌃' : '⌄'}</span>
        </button>
      {:else if canEdit}
        <button type="button" class="action add" onclick={() => onEdit?.('notes')}>＋ メモ</button>
      {/if}
      {#if option.url}
        <a class="action" href={option.url} target="_blank" rel="noopener noreferrer"
          aria-label={option.title + 'のリンクを開く'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M14 3h7v7M21 3l-10 10"/></svg>
          リンク
        </a>
      {:else if canEdit}
        <button type="button" class="action add" onclick={() => onEdit?.('url')}>＋ リンク</button>
      {/if}
      {#if canEdit}
        <button type="button" class="action edit" onclick={() => onEdit?.()}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5 4 4M4 20l4.7-.9L19 8.8a2.1 2.1 0 0 0-3-3L5.7 16.2 4 20Z"/></svg>
          編集
        </button>
      {/if}
    </div>
  {/if}
  {#if noteOpen && option.notes}
    <div class="note" aria-label={option.title + 'のメモ'}>{option.notes}</div>
  {/if}
</article>

<style>
  .option-card{min-width:0;overflow:hidden;padding:12px;border:1px solid #e1e8e3;border-radius:12px;background:#fff;box-shadow:0 2px 8px #20382b06;color:#26392f;transition:border-color .15s,background .15s,box-shadow .15s}
  .option-card.chosen{border-color:#83b39c;background:#f2f9f4;box-shadow:inset 0 0 0 1px #b6d7c2}
  .option-head{display:flex;align-items:flex-start;gap:9px;min-width:0}
  .pick{display:grid;place-items:center;flex:none;width:28px;height:28px;padding:0;border:1.5px solid #b7c8bc;border-radius:50%;background:#fff;color:#fff;cursor:pointer}
  .pick.chosen{border-color:#327661;background:#327661}
  .pick span{font-size:15px;font-weight:800;line-height:1}
  .pick:disabled{opacity:.55;cursor:not-allowed}
  .pick.read-only{cursor:default}
  .option-heading{display:grid;gap:3px;flex:1;min-width:0;padding-top:3px}
  .option-heading strong{font-size:13px;line-height:1.4;overflow-wrap:anywhere}
  .option-heading small{font-size:11px;color:#718476}
  .price{flex:none;margin-top:4px;font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}
  .meta{display:flex;flex-wrap:wrap;gap:4px 10px;margin:8px 0 0 37px;color:#6a7f70}
  .meta-item{font-size:11px;line-height:1.5;overflow-wrap:anywhere}
  .actions{display:flex;align-items:center;flex-wrap:wrap;gap:4px;margin:10px 0 0 37px}
  .action{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:32px;padding:6px 9px;border:1px solid #dae6dc;border-radius:8px;background:#fff;color:#316b55;text-decoration:none;font-size:11px;font-weight:700;cursor:pointer;line-height:1.2}
  .action svg{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  .action.add{border-style:dashed;color:#598070;background:transparent}
  .action.edit{margin-left:auto;border-color:transparent;background:transparent}
  .action:hover{background:#edf6f0;border-color:#8dbba2}
  .note{margin:8px 0 0 37px;padding:10px 12px;border-left:2px solid #9fcbb2;border-radius:0 8px 8px 0;background:#f6faf7;color:#354c3d;font-size:12px;line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere}
  button:focus-visible,a:focus-visible{outline:2px solid #327661;outline-offset:2px}
  .compact{padding:9px 8px;border-radius:10px;box-shadow:none}
  .compact .option-head{gap:7px}
  .compact .pick{width:24px;height:24px}
  .compact .option-heading strong{font-size:11px}
  .compact .price{font-size:11px}
  .compact .meta,.compact .actions,.compact .note{margin-left:31px}
  .compact .action{min-height:28px;padding:5px 7px;font-size:10px}
  @media(max-width:420px){
    .option-card{padding:10px}
    .option-head{flex-wrap:wrap}
    .price{margin-left:auto}
    .actions{gap:4px}
    .action{min-height:34px}
    .action.edit{margin-left:0}
  }
</style>
