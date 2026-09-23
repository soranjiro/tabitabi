<script lang="ts">
  import type { Step } from '@tabitabi/types';
  import type { Place } from '$lib/planning/places';
  import PlaceMap from '../planning-map/PlaceMap.svelte';

  let { step, initialPlace, onClose, onSave, onRemove }: {
    step: Step;
    initialPlace: Place | null;
    onClose: () => void;
    onSave: (place: Place) => Promise<void>;
    onRemove: () => Promise<void>;
  } = $props();
  let center = $state<Place | null>(initialPlace);
  let saving = $state(false);

  async function save() {
    if (!center || saving) return;
    saving = true;
    try { await onSave(center); } finally { saving = false; }
  }
  async function remove() {
    if (saving) return;
    saving = true;
    try { await onRemove(); } finally { saving = false; }
  }
</script>

<div class="backdrop" role="presentation">
  <div class="editor" role="dialog" aria-modal="true" aria-label="ピンの位置を修正">
    <header><h2>ピンの位置を修正</h2><button onclick={onClose} aria-label="閉じる">×</button></header>
    <p>地図を動かし、中央のピンを目的の場所に合わせてください。</p>
    <div class="map"><PlaceMap steps={[step]} numbers={{ [step.id]: 1 }} selected={step.id} canEdit={false} centerMode={true} onSelect={() => {}} onPin={() => {}} onCenterChange={(place) => center = place} /></div>
    <div class="actions"><button onclick={remove} disabled={saving}>ピンを外す</button><button onclick={save} disabled={!center || saving}>この位置に変更</button></div>
  </div>
</div>

<style>
  .backdrop { position:fixed; z-index:200; inset:0; display:flex; background:#192b254d; }
  .editor { width:min(700px,100%); margin:auto; padding:20px; border-radius:16px; background:white; }
  header { display:flex; justify-content:space-between; align-items:center; }
  h2 { font-size:20px; }
  header button { border:0; background:none; font-size:26px; cursor:pointer; }
  p { font-size:13px; }
  .map { height:min(60dvh,480px); }
  .actions { display:flex; gap:10px; margin-top:20px; }
  .actions button { padding:10px 15px; border:0; border-radius:9px; background:#2f6657; color:white; font:inherit; font-size:12px; font-weight:700; cursor:pointer; }
  .actions button:first-child { background:#edf3ef; color:#2f6657; }
  @media(max-width:760px) { .editor { height:100dvh; border-radius:0; } .map { height:65dvh; } }
</style>
