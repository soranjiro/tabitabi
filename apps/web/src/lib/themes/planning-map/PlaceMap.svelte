<script lang="ts">
  import { onMount } from 'svelte';
  import { env } from '$env/dynamic/public';
  import type { Step } from '@tabitabi/types';
  import type * as Leaflet from 'leaflet';
  import { getPlace, type Place } from '$lib/planning/places';
  import { getStepSchedule } from '$lib/planning/schedule';
  import 'leaflet/dist/leaflet.css';
  let { steps, numbers, selected, canEdit, onSelect, onPin }: { steps: Step[]; numbers: Record<string, number>; selected: string | null; canEdit: boolean; onSelect: (id: string) => void; onPin: (place: Place) => void } = $props();
  let container: HTMLDivElement;
  let map: Leaflet.Map | undefined;
  let L: typeof Leaflet;
  let layer: Leaflet.LayerGroup;
  let ready = $state(false);
  let failed = $state(false);
  let adding = $state(false);
  let tiles: Leaflet.TileLayer;
  function fit() {
    const points = steps.map(s => getPlace(s.notes)).filter((p): p is Place => !!p);
    if (points.length) map?.fitBounds(points.map(p => [p.lat, p.lng] as [number, number]), { padding: [55, 55], maxZoom: 14 });
  }
  onMount(() => {
    let disposed = false;
    let observer: ResizeObserver;
    void import('leaflet').then(module => {
      if (disposed) return;
      L = module;
      map = L.map(container, { scrollWheelZoom: false }).setView([35.01, 135.77], 13);
      tiles = L.tileLayer(env.PUBLIC_PLANNING_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, keepBuffer: 0,
        attribution: env.PUBLIC_PLANNING_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      tiles.on('tileerror', () => failed = true);
      layer = L.layerGroup().addTo(map);
      map.on('click', (e: Leaflet.LeafletMouseEvent) => {
        if (canEdit && adding) { onPin({ lat: e.latlng.lat, lng: e.latlng.wrap().lng }); adding = false; }
      });
      observer = new ResizeObserver(() => { map?.invalidateSize(); fit(); });
      observer.observe(container);
      ready = true;
      fit();
    }).catch(() => failed = true);
    return () => { disposed = true; observer?.disconnect(); map?.remove(); };
  });
  $effect(() => {
    if (!ready) return;
    layer.clearLayers();
    steps.forEach((step, index) => {
      const place = getPlace(step.notes);
      if (!place) return;
      const day = getStepSchedule(step);
      const marker = L.marker([place.lat, place.lng], {
        title: step.title, keyboard: true,
        icon: L.divIcon({ className: 'atelier-marker', html: `<span style="background:${selected === step.id ? '#b75b38' : day.precision === 'undecided' ? '#35695d' : '#556ca1'}">${numbers[step.id]}</span>`, iconSize: [34, 42], iconAnchor: [17, 42] }),
      }).addTo(layer);
      const label = document.createElement('span'); label.textContent = step.title;
      marker.bindTooltip(label, { direction: 'top', offset: [0, -35] });
      marker.on('click', () => onSelect(step.id));
    });
  });
  $effect(() => {
    if (!ready || !selected) return;
    const place = getPlace(steps.find(s => s.id === selected)?.notes);
    if (place) map?.panTo([place.lat, place.lng]);
  });
</script>
<div class="map-frame" class:adding>
  <div class="canvas" bind:this={container} aria-label="行きたい場所の地図"></div>
  <div class="map-tools">
    <button onclick={fit} disabled={!ready}>全候補を表示</button>
    {#if canEdit}<button class:active={adding} disabled={!ready} onclick={() => adding = !adding}>{adding ? 'ピン追加をやめる' : '＋ 地図にピンを刺す'}</button>{/if}
  </div>
  {#if adding}<div class="map-hint" role="status">行きたい場所をタップ。<button onclick={() => { const p = map?.getCenter(); if (p) { onPin({ lat: p.lat, lng: p.wrap().lng }); adding = false; } }}>地図の中心に追加</button></div>{/if}
  {#if failed}<div class="map-error" role="status">地図を読み込めません。候補リストから計画を続けられます。<button onclick={() => { failed = false; tiles?.redraw(); }}>再試行</button></div>{/if}
  {#if !ready && !failed}<div class="map-hint">地図をひらいています…</div>{/if}
  <div class="legend"><span>● 候補</span><span>● 日を仮決め</span></div>
</div>
<style>
  .map-frame { position:relative; height:100%; min-height:460px; background:#e7ece1; isolation:isolate; border-radius:20px; overflow:hidden; }
  .canvas { position:absolute; inset:0; z-index:0; }
  .adding .canvas { cursor:crosshair; }
  .map-tools { position:absolute; top:18px; right:18px; display:flex; gap:8px; z-index:2; }
  button { min-height:40px; padding:9px 13px; border:1px solid #d9dfd7; border-radius:9px; background:#fff; color:#294b42; font:inherit; font-size:12px; cursor:pointer; box-shadow:0 3px 12px #253e2910; }
  button.active { background:#35695d; color:white; }
  .map-hint,.map-error { position:absolute; top:75px; left:50%; transform:translateX(-50%); width:max-content; max-width:85%; padding:12px 16px; background:white; border-radius:12px; z-index:3; font-size:12px; box-shadow:0 3px 15px #0002; }
  .map-error { background:#fff5e5; }
  .legend { position:absolute; bottom:30px; left:16px; display:flex; gap:15px; padding:8px 12px; background:#fffffff0; border-radius:8px; font-size:11px; color:#35695d; }
  .legend span+span { color:#556ca1; }
  :global(.atelier-marker span) { display:grid; place-items:center; width:34px; height:34px; border:3px solid white; border-radius:50% 50% 50% 4px; color:white; box-shadow:0 3px 10px #213b3440; font-size:12px; font-weight:bold; }
  @media(max-width:700px) { .map-frame { min-height:360px; border-radius:14px; } .map-tools { top:12px; right:10px; gap:4px; } button { padding:8px; font-size:11px; } }
</style>
