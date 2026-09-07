<script lang="ts">
  import type { Step } from '@tabitabi/types';
  import { getMemoText } from '$lib/memo';
  import { getPlace, distanceKm, type Place } from '$lib/planning/places';
  import { getStepSchedule } from '$lib/planning/schedule';
  import PlaceMap from './PlaceMap.svelte';
  let { steps, canEdit, onCreate, onEdit, onPreview }: { steps: Step[]; canEdit: boolean; onCreate: (place?: Place) => void; onEdit: (step: Step) => void; onPreview: () => void } = $props();
  let selected = $state<string | null>(null);
  let query = $state('');
  let filter = $state('all');
  const numbers = $derived(Object.fromEntries(steps.map((s,i) => [s.id,i+1])));
  const candidateCount = $derived(steps.filter(s => getStepSchedule(s).precision === 'undecided').length);
  const selectedStep = $derived(steps.find(s => s.id === selected));
  const origin = $derived(getPlace(selectedStep?.notes));
  const visible = $derived(steps.filter(s => {
    const schedule = getStepSchedule(s);
    return (filter === 'all' || (filter === 'idea' && schedule.precision === 'undecided') || (filter === 'priority' && getPlace(s.notes)?.priority)) &&
      `${s.title} ${s.location || ''} ${getMemoText(s.notes)}`.toLowerCase().includes(query.toLowerCase());
  }));
  const nearby = $derived(origin ? steps.filter(s => s.id !== selected && getPlace(s.notes)).map(s => ({ step: s, distance: distanceKm(origin!, getPlace(s.notes)!) })).sort((a,b) => a.distance-b.distance).slice(0,3) : []);
</script>
<section class="atelier-intro">
  <div><span class="eyebrow">TRAVEL ATELIER</span><h2>「行きたい」から、旅を描こう。</h2><p>日付も、順番も、まだ決めなくて大丈夫。</p></div>
  <div class="process"><span class="current"><b>01</b> 集める</span><span><b>02</b> 近くを見比べる</span><button onclick={onPreview}><b>03</b> 日に分ける ↗</button></div>
</section>
<details class="how-to"><summary>このしおりの使い方 — 予定が未定でも、ここから始められます</summary><ol><li><strong>場所名で探す。</strong> 施設名や「地域＋場所名」で検索し、住所とピンを確かめて候補に追加。まだ日時は不要です。</li><li><strong>行きたい理由を残す。</strong> 「晴れたら」「予約を調べる」などのメモと、絶対行きたい場所の★を付けます。</li><li><strong>近くをまとめる。</strong> 候補を選ぶと近い場所を比較できます。同じエリアを同じ日に仮置きしましょう。</li><li><strong>少しずつ旅程にする。</strong> 「旅程を見る」で日・順番・時間を編集。未定の候補は残しておけます。</li></ol><p>地図上をタップして追加することもできます。検索結果の住所・営業時間・予約の要否は、訪問前に公式情報を確認しましょう。</p></details>
{#if canEdit}<button class="find-place" onclick={() => onCreate()}>⌕ 場所名から探して追加 <span>施設名・お店・駅など</span></button>{/if}
<div class="workspace">
  <aside class="ideas">
    <div class="ideas-heading"><div><span class="eyebrow">MY WISHLIST</span><h3>行きたいリスト <small>{steps.length}</small></h3></div>{#if canEdit}<button class="add" onclick={() => onCreate()} aria-label="候補を追加">＋</button>{/if}</div>
    <label class="search"><span>⌕</span><input aria-label="保存した候補を検索" placeholder="保存した候補を検索" bind:value={query} /></label>
    <div class="filters" aria-label="候補の絞り込み"><button class:active={filter === 'all'} onclick={() => filter = 'all'}>すべて</button><button class:active={filter === 'idea'} onclick={() => filter = 'idea'}>未定 {candidateCount}</button><button class:active={filter === 'priority'} onclick={() => filter = 'priority'}>★ 行きたい</button></div>
    <div class="cards">
      {#each visible as step}
        {@const place = getPlace(step.notes)}
        {@const schedule = getStepSchedule(step)}
        <button class="idea" class:selected={selected === step.id} onclick={() => selected = step.id}>
          <span class="number">{steps.indexOf(step)+1}</span><div><span class="status">{schedule.precision === 'undecided' ? 'まだ候補' : schedule.day ? `Day ${schedule.day}` : '日時設定済み'}{place?.priority ? ' · ★ 絶対行きたい' : ''}</span><strong>{step.title}</strong><p>{getMemoText(step.notes) || '気になった理由をメモしておこう'}</p><small>{place ? (step.location || '地図にピンあり') : '○ 場所はあとで'}</small></div><span class="arrow">↗</span>
        </button>
      {/each}
      {#if !visible.length}<div class="empty"><strong>{steps.length ? '一致する候補がありません' : '最初の「行きたい」を置こう'}</strong><p>{steps.length ? '検索条件を変えてみましょう。' : '地図にピンを刺すか、＋から名前だけでも追加できます。'}</p></div>{/if}
    </div>
    <div class="note"><span>✎</span><p>まずは気になる場所を集めよう。<br/>全部まわらなくても、いい旅になる。</p></div>
  </aside>
  <div class="map-area"><PlaceMap steps={visible} {numbers} {selected} {canEdit} onSelect={(id) => selected = id} onPin={onCreate} /></div>
</div>
{#if selectedStep}
  <section class="detail" aria-label="選んだ候補">
    <div><span class="eyebrow">PICKED PLACE</span><h3>{selectedStep.title}</h3><p>{getMemoText(selectedStep.notes) || '行きたい理由や、調べたいことを残しておこう。'}</p></div>
    <div class="nearby"><strong>近くの候補 <small>直線距離・移動時間ではありません</small></strong>{#if nearby.length}{#each nearby as item}<button onclick={() => selected = item.step.id}>{item.step.title}<span>{item.distance.toFixed(1)} km</span></button>{/each}{:else}<p>ピンのある候補が増えると、近い場所を比べられます。</p>{/if}</div>
    {#if canEdit}<button class="edit" onclick={() => onEdit(selectedStep!)}>メモ・場所・行く日を編集 ↗</button>{/if}
  </section>
{/if}
<div class="next"><div><strong>{steps.length - candidateCount} 件を仮決め。まだ {candidateCount} 件の可能性。</strong><p>近い場所を同じ日にまとめると、余白のある旅に。</p></div><button onclick={onPreview}>日ごとに組み立てる →</button></div>
<style>
  .how-to { padding:14px 18px; margin-bottom:18px; border:1px solid #dde3d5; border-radius:12px; background:#f4f5ee; font-size:12px; line-height:1.9; }
  .how-to summary { cursor:pointer; color:#35695d; font-weight:650; }
  .how-to ol { padding-left:20px; }.how-to li { margin:8px 0; }
  .find-place { display:flex; gap:20px; align-items:center; padding:14px 20px; margin:0 0 18px; border-radius:12px; background:#35695d; color:white; font-size:14px; }
  .find-place span { color:#e0ecdb; font-size:11px; }
  .atelier-intro { display:flex; justify-content:space-between; align-items:center; gap:20px; padding:32px 0 26px; }
  .eyebrow { color:#9a7755; font-size:10px; letter-spacing:.18em; font-weight:750; }
  h2 { margin:9px 0; font-family:serif; font-size:clamp(22px,3vw,31px); font-weight:600; letter-spacing:.035em; }
  p { color:#78837c; font-size:12px; line-height:1.8; margin:5px 0; }
  .process { display:flex; gap:8px; font-size:11px; white-space:nowrap; }
  .process span,.process button { padding:12px; background:#eeeee7; border-radius:8px; }
  .process .current { background:#e0e9df; color:#35695d; }
  .process b { margin-right:6px; font-family:serif; }
  button { font:inherit; color:inherit; cursor:pointer; border:0; background:none; }
  .workspace { display:grid; grid-template-columns:330px minmax(0,1fr); gap:20px; min-height:530px; }
  .ideas { display:flex; flex-direction:column; padding:22px 18px 14px; background:#fffefa; border:1px solid #e5e5dc; border-radius:20px; min-width:0; }
  .ideas-heading { display:flex; justify-content:space-between; align-items:center; }
  h3 { margin:7px 0 15px; font-size:18px; }
  h3 small { margin-left:8px; font-size:12px; color:#879187; }
  .add { width:38px; height:38px; background:#35695d; color:white; border-radius:12px; font-size:22px; }
  .search { display:flex; align-items:center; gap:8px; padding:10px 12px; background:#f4f4ed; border-radius:10px; }
  input { width:100%; background:none; border:0; outline:none; font:inherit; font-size:12px; }
  .filters { display:flex; gap:5px; margin:14px 0; }
  .filters button { padding:7px 9px; font-size:11px; border-radius:7px; color:#78837c; }
  .filters .active { background:#e9eee5; color:#35695d; }
  .cards { max-height:370px; overflow:auto; }
  .idea { display:flex; width:100%; align-items:start; gap:10px; padding:15px 8px; border-top:1px solid #eeeee7; text-align:left; }
  .idea.selected { background:#eef3e9; border-radius:10px; }
  .number { flex-shrink:0; display:grid; place-items:center; width:24px; height:24px; margin-top:5px; background:#e6ede4; color:#35695d; border-radius:50%; font-size:10px; }
  .idea div { min-width:0; flex:1; }
  .status { display:block; color:#9a7755; font-size:9px; margin-bottom:5px; }
  .idea strong { font-size:14px; overflow-wrap:anywhere; }
  .idea p { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; }
  .idea small { color:#758476; font-size:10px; }
  .arrow { color:#8e9a8d; }
  .note { display:flex; gap:10px; align-items:center; margin-top:auto; padding:16px 8px 0; }
  .note p { font-size:10px; }
  .note>span { font-size:24px; color:#ad9878; }
  .detail { display:grid; grid-template-columns:1fr 1fr auto; align-items:center; gap:24px; margin-top:20px; padding:24px; border:1px solid #dfe4d9; background:#fffefa; border-radius:16px; }
  .detail p { white-space:pre-line; overflow-wrap:anywhere; }
  .nearby strong { font-size:12px; }.nearby small { display:block; font-size:9px; font-weight:400; color:#7c867e; }
  .nearby button { display:flex; width:100%; justify-content:space-between; padding:6px 0; font-size:12px; }.nearby span { color:#8d947e; }
  .edit,.next button { background:#35695d; color:white; padding:13px 18px; border-radius:10px; font-size:12px; }
  .next { display:flex; justify-content:space-between; gap:16px; align-items:center; margin:24px 0 36px; padding:0 6px; }.next strong { font-size:13px; }
  .empty { padding:24px 6px; font-size:13px; }
  @media(max-width:1000px) { .atelier-intro { align-items:start; flex-direction:column; }.detail { grid-template-columns:1fr 1fr; }.detail .edit { grid-column:1/-1; } }
  @media(max-width:700px) { .workspace { display:flex; flex-direction:column; gap:14px; }.map-area { order:-1; height:360px; }.atelier-intro { padding:22px 0 18px; gap:12px; }.process { gap:5px; font-size:10px; }.process span,.process button { padding:9px; }.ideas { padding:18px 14px; }.cards { max-height:330px; }.detail { grid-template-columns:1fr; padding:20px; gap:16px; }.next { align-items:start; flex-direction:column; }.next button { width:100%; } }
</style>
