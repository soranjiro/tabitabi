<script lang="ts">
  import { onDestroy } from 'svelte';
  import { env } from '$env/dynamic/public';
  import { searchPlaces, type PlaceResult } from './search';
  let { onSelect }: { onSelect: (place: PlaceResult) => void } = $props();
  let query = $state('');
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
    if (query.trim().length < 2 || busy) return;
    controller?.abort(); controller = new AbortController();
    const activeController = controller;
    const current = ++requestId;
    busy = true; error = ''; searched = false; results = [];
    const timer = setTimeout(() => activeController.abort(), 12000);
    try {
      const found = await searchPlaces(query, env.PUBLIC_PLANNING_SEARCH_URL || 'https://photon.komoot.io/api/', controller.signal);
      if (current === requestId) { results = found; searched = true; }
    } catch (e) {
      if (current === requestId) error = e instanceof Error && e.name !== 'AbortError' ? e.message : '検索がタイムアウトしました。もう一度お試しください。';
    } finally { clearTimeout(timer); if (current === requestId) busy = false; }
  }
</script>
<div class="place-search">
  <label for="place-query">場所名・施設名から探す</label>
  <p>「京都 南禅寺」のように、地域名を添えると見つけやすくなります。</p>
  <div class="search-row"><input id="place-query" bind:value={query} oninput={changeQuery} onkeydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }} placeholder="例：京都 南禅寺、金沢駅" autocomplete="off" maxlength="160" /><button type="button" disabled={busy || query.trim().length < 2} onclick={search}>{busy ? '検索中…' : '場所を検索'}</button></div>
  <div aria-live="polite" aria-busy={busy}>
    {#if error}<p class="error" role="alert">{error} 名前だけで保存し、場所をあとで決めることもできます。</p>{/if}
    {#if searched && !results.length}<p>見つかりませんでした。地域名や別の表記で検索するか、名前だけで候補に残しましょう。</p>{/if}
    {#if results.length}<p>住所を確かめて、場所を選んでください。</p><ul>{#each results as result}<li><button type="button" onclick={() => { onSelect(result); results = []; searched = false; }}><strong>{result.name}</strong><small>{result.address || '住所の登録なし・地図で位置をご確認ください'}</small><span>この場所を選ぶ →</span></button></li>{/each}</ul>{/if}
  </div>
  <small class="credit">検索: <a href="https://github.com/komoot/photon" target="_blank" rel="noreferrer">Photon</a> / © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a></small>
</div>
<style>
  .place-search { padding:16px; background:#eef3e9; border-radius:12px; }
  label { font-weight:700; font-size:14px; color:#294b42; }
  p { margin:7px 0 12px; font-size:12px; line-height:1.7; color:#657462; }
  .search-row { display:flex; gap:8px; }
  input { min-width:0; flex:1; padding:12px; border:1px solid #ccd8c7; border-radius:8px; background:white; font:inherit; font-size:14px; }
  button { cursor:pointer; border:0; border-radius:8px; background:#35695d; color:white; padding:12px; font:inherit; font-size:12px; }
  button:disabled { opacity:.5; cursor:default; }
  ul { padding:0; margin:10px 0; list-style:none; display:grid; gap:8px; max-height:280px; overflow:auto; }
  li button { display:grid; gap:6px; width:100%; background:white; color:#294b42; text-align:left; border:1px solid #d2decd; }
  li strong { font-size:14px; } li small { color:#6b7867; font-size:11px; } li span { font-size:11px; color:#35695d; }
  .credit { display:block; margin-top:10px; font-size:10px; color:#6b7867; } a { color:inherit; text-decoration:underline; } .error { color:#9f4338; }
  :focus-visible { outline:2px solid #35695d; outline-offset:2px; }
</style>
