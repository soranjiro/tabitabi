<script lang="ts">
  import { onDestroy } from 'svelte';
  import { env } from '$env/dynamic/public';
  import { searchPlaces, type PlaceResult } from './search';
  let { value = $bindable(''), onSelect }: { value?: string | null; onSelect: (place: PlaceResult) => void } = $props();
  let results = $state<PlaceResult[]>([]);
  let busy = $state(false);
  let searched = $state(false);
  let error = $state('');
  let controller: AbortController | undefined;
  let requestId = 0;
  onDestroy(() => controller?.abort());
  function changeQuery() {
    requestId++; controller?.abort(); busy = false; searched = false; results = []; error = '';
  }
  async function search() {
    if ((value?.trim().length ?? 0) < 2 || busy) return;
    controller?.abort(); controller = new AbortController();
    const activeController = controller;
    const current = ++requestId;
    busy = true; error = ''; searched = false; results = [];
    const timer = setTimeout(() => activeController.abort(), 12000);
    try {
      const found = await searchPlaces(value ?? '', env.PUBLIC_PLANNING_SEARCH_URL || 'https://photon.komoot.io/api/', controller.signal);
      if (current === requestId) { results = found; searched = true; }
    } catch (e) {
      if (current === requestId) error = e instanceof Error && e.name !== 'AbortError' ? e.message : '検索がタイムアウトしました。もう一度お試しください。';
    } finally { clearTimeout(timer); if (current === requestId) busy = false; }
  }
</script>
<div class="place-search">
  <div class="search-row"><input aria-label="場所" bind:value oninput={changeQuery} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }} placeholder="場所を入力" autocomplete="off" maxlength="160" /><button type="button" disabled={busy || (value?.trim().length ?? 0) < 2} onclick={search}>{busy ? '検索中…' : '場所を検索'}</button></div>
  <div aria-live="polite" aria-busy={busy}>
    {#if error}<p class="error" role="alert">{error} 名前だけで保存し、場所をあとで決めることもできます。</p>{/if}
    {#if searched && !results.length}<p>見つかりませんでした。地域名や別の表記で検索するか、名前だけで候補に残しましょう。</p>{/if}
    {#if results.length}<ul>{#each results as result}<li><button type="button" onclick={() => { onSelect(result); value = `${result.name} ${result.address}`.trim(); results = []; searched = false; }}><strong>{result.name}</strong><small>{result.address || '住所の登録なし・地図で位置をご確認ください'}</small></button></li>{/each}</ul>{/if}
  </div>
  <small class="credit">検索: <a href="https://github.com/komoot/photon" target="_blank" rel="noreferrer">Photon</a> / © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></small>
</div>
<style>
  .place-search { min-width:0; }
  .search-row { display:flex; gap:6px; }
  input { min-width:0; flex:1; padding:10px 11px; border:1px solid #ccd8c7; border-radius:8px; background:white; font:inherit; font-size:14px; }
  button { flex:none; cursor:pointer; border:0; border-radius:8px; background:#35695d; color:white; padding:10px 12px; font:inherit; font-size:12px; font-weight:700; white-space:nowrap; }
  button:disabled { opacity:.5; cursor:default; }
  p { margin:6px 0 0; font-size:11px; line-height:1.5; color:#657462; }
  ul { padding:0; margin:6px 0 0; list-style:none; display:grid; gap:4px; max-height:220px; overflow:auto; }
  li button { display:grid; gap:2px; width:100%; padding:9px 10px; background:white; color:#294b42; text-align:left; border:1px solid #d2decd; }
  li strong { font-size:13px; } li small { color:#6b7867; font-size:11px; }
  .credit { display:block; margin-top:5px; font-size:9px; color:#89938a; } a { color:inherit; text-decoration:underline; } .error { color:#9f4338; }
  :focus-visible { outline:2px solid #35695d; outline-offset:2px; }
</style>
