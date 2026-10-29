<script lang="ts">
  import type { Step } from '@tabitabi/types';
  import { getPlace } from '$lib/planning/places';
  import { getMemoText } from '$lib/memo';
  import PlaceMap from '../planning-map/PlaceMap.svelte';

  let { step, canEdit, dateLabel, icon, onClose, onEdit, onPlaceEdit, onDelete }: {
    step: Step;
    canEdit: boolean;
    dateLabel: string;
    icon: string;
    onClose: () => void;
    onEdit: () => void;
    onPlaceEdit: () => void;
    onDelete: () => void;
  } = $props();

  const relatedUrl = $derived.by(() => {
    if (!step.link) return null;
    try {
      const url = new URL(step.link);
      return ['http:', 'https:'].includes(url.protocol) ? url : null;
    } catch { return null; }
  });
</script>

<div class="backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && onClose()}>
  <div class="drawer" role="dialog" aria-modal="true" aria-label="予定詳細">
    <button class="close" onclick={onClose} aria-label="閉じる">×</button>
    <p class="kicker">{icon} 予定詳細</p>
    <h2>{step.title}</h2>
    <p class="status">{dateLabel}</p>
    <dl>
      <dt>種類</dt><dd>{step.type ?? '一般'}</dd>
      <dt>場所</dt><dd>{step.location || '未定'}</dd>
      <dt>メモ</dt><dd class="note">{getMemoText(step.notes) || 'なし'}</dd>
      {#if relatedUrl}<dt>関連リンク</dt><dd><a href={relatedUrl.href} target="_blank" rel="noopener noreferrer">{relatedUrl.hostname} · 開く ↗</a></dd>{/if}
    </dl>
    {#if getPlace(step)}<div class="detail-map"><PlaceMap steps={[step]} numbers={{ [step.id]: 1 }} selected={step.id} canEdit={false} onSelect={() => {}} onPin={() => {}} /></div>{/if}
    {#if canEdit}<div class="actions"><button onclick={onEdit}>編集</button>{#if getPlace(step)}<button onclick={onPlaceEdit}>位置を修正</button>{/if}<button class="delete" onclick={onDelete}>削除</button></div>{/if}
  </div>
</div>

<style>
  .backdrop { position:fixed; z-index:200; inset:0; display:flex; justify-content:flex-end; background:#192b254d; }
  .drawer { position:relative; width:min(440px,100%); height:100%; overflow:auto; padding:28px 24px 100px; background:#fff; box-shadow:-8px 0 30px #0002; }
  .close { position:absolute; top:18px; right:18px; border:0; background:transparent; font-size:28px; cursor:pointer; }
  .kicker { margin:0 0 8px; color:#638175; font-size:12px; }
  h2 { margin:0 35px 8px 0; font-size:24px; }
  .status { padding:10px 12px; border-radius:9px; background:#edf4ef; color:#28594d; font-weight:700; }
  dl { display:grid; gap:6px; }
  dt { margin-top:12px; color:#7a8581; font-size:11px; }
  dd { margin:0; overflow-wrap:anywhere; font-size:14px; }
  .note { white-space:pre-line; }
  a { color:#1860b3; }
  .detail-map { height:210px; margin:20px 0; }
  .detail-map :global(.map-frame) { min-height:210px; }
  .actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:20px; }
  .actions button { padding:10px 15px; border:0; border-radius:9px; background:#2f6657; color:white; font:inherit; font-size:12px; font-weight:700; cursor:pointer; }
  .actions button:nth-child(2) { background:#edf3ef; color:#2f6657; }
  .actions .delete { margin-left:auto; background:#fff0ee; color:#a14e45; }
  @media(max-width:760px) { .drawer { width:100%; } }
</style>
