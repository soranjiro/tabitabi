<script lang="ts">
  import { onMount } from 'svelte';
  import { env } from '$env/dynamic/public';
  import type { Step } from '@tabitabi/types';
  import type * as Leaflet from 'leaflet';
  import { getPlace, type Place } from '$lib/planning/places';
  import { getStepSchedule } from '$lib/planning/schedule';
  import { getStepTypeIcon } from '../standard/core/utils/step-type';
  import 'leaflet/dist/leaflet.css';
  let { steps, numbers, selected, canEdit, onSelect, onPin, onMove, onCenterChange, centerMode = false }: { steps: Step[]; numbers: Record<string, number>; selected: string | null; canEdit: boolean; onSelect: (id: string) => void; onPin: (place: Place) => void; onMove?: (id: string, place: Place) => void; onCenterChange?: (place: Place) => void; centerMode?: boolean } = $props();
  let container: HTMLDivElement;
  let map: Leaflet.Map | undefined;
  let L: typeof Leaflet;
  let layer: Leaflet.LayerGroup;
  let ready = $state(false);
  let failed = $state(false);
  let adding = $state(false);
  let tiles: Leaflet.TileLayer;
  let labelMarkers: { id: string; marker: Leaflet.Marker }[] = [];
  let layoutFrame: number | null = null;
  const htmlEntities: Record<string, string> = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => htmlEntities[char]);
  const overlaps = (a: DOMRect, b: DOMRect) =>
    a.left < b.right + 4 && a.right + 4 > b.left &&
    a.top < b.bottom + 4 && a.bottom + 4 > b.top;

  // Keep titles readable at a glance, but never cover other markers or labels.
  // Try both sides of each pin before hiding a label in a dense map.
  function layoutLabels() {
    if (!map || !container) return;
    const frame = container.getBoundingClientRect();
    if (!frame.width || !frame.height) return;
    const entries = labelMarkers.map(({ id, marker }) => {
      const element = marker.getElement();
      return {
        id,
        label: element?.querySelector<HTMLElement>('.atelier-marker-label'),
        pin: element?.querySelector<HTMLElement>('.atelier-marker-pin'),
      };
    });
    const pins = entries.flatMap(entry => entry.pin ? [{ id: entry.id, rect: entry.pin.getBoundingClientRect() }] : []);
    const controls = Array.from(container.parentElement?.querySelectorAll<HTMLElement>('.map-tools, .map-hint, .map-error') ?? [])
      .filter(element => element.getClientRects().length)
      .map(element => element.getBoundingClientRect());
    const occupied: DOMRect[] = [];
    const ordered = [...entries].sort((a, b) => Number(b.id === selected) - Number(a.id === selected));
    for (const entry of ordered) {
      if (!entry.label || !entry.pin) continue;
      const label = entry.label;
      label.classList.remove('is-hidden');
      const pin = entry.pin.getBoundingClientRect();
      const preferLeft = pin.left + pin.width / 2 > frame.left + frame.width / 2;
      const sides = preferLeft ? [true, false] : [false, true];
      let placed = false;
      for (const left of sides) {
        label.classList.toggle('is-left', left);
        const rect = label.getBoundingClientRect();
        const inFrame = rect.left >= frame.left + 5 && rect.right <= frame.right - 5 &&
          rect.top >= frame.top + 5 && rect.bottom <= frame.bottom - 5;
        const blocked = occupied.some(other => overlaps(rect, other)) ||
          pins.some(other => other.id !== entry.id && overlaps(rect, other.rect)) ||
          controls.some(other => overlaps(rect, other));
        if (inFrame && !blocked) {
          occupied.push(rect);
          placed = true;
          break;
        }
      }
      if (!placed && entry.id === selected) {
        // The active place must stay identifiable even in a crowded area.
        label.classList.toggle('is-left', preferLeft);
        occupied.push(label.getBoundingClientRect());
      } else if (!placed) {
        label.classList.add('is-hidden');
      }
    }
  }

  function scheduleLabelLayout() {
    if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = null;
      layoutLabels();
    });
  }
  function fit() {
    const points = steps.map(s => getPlace(s)).filter((p): p is Place => !!p);
    if (points.length) map?.fitBounds(points.map(p => [p.lat, p.lng] as [number, number]), { padding: [55, 55], maxZoom: 14 });
  }
  onMount(() => {
    let disposed = false;
    let observer: ResizeObserver;
    void import('leaflet').then(module => {
      if (disposed) return;
      L = module;
      map = L.map(container, { scrollWheelZoom: true, touchZoom: true, zoomControl: true }).setView([35.01, 135.77], 13);
      tiles = L.tileLayer(env.PUBLIC_PLANNING_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, keepBuffer: 0,
        attribution: env.PUBLIC_PLANNING_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      tiles.on('tileerror', () => failed = true);
      layer = L.layerGroup().addTo(map);
      map.on('click', (e: Leaflet.LeafletMouseEvent) => {
        if (canEdit && adding) { onPin({ lat: e.latlng.lat, lng: e.latlng.wrap().lng }); adding = false; }
      });
      map.on('moveend', () => {
        if (centerMode && map) { const p = map.getCenter(); onCenterChange?.({ lat: p.lat, lng: p.wrap().lng }); }
        scheduleLabelLayout();
      });
      map.on('zoomend', scheduleLabelLayout);
      observer = new ResizeObserver(() => { map?.invalidateSize(); fit(); scheduleLabelLayout(); });
      observer.observe(container);
      ready = true;
      fit();
    }).catch(() => failed = true);
    return () => { disposed = true; observer?.disconnect(); if (layoutFrame !== null) cancelAnimationFrame(layoutFrame); map?.remove(); };
  });
  $effect(() => {
    if (!ready) return;
    layer.clearLayers();
    labelMarkers = [];
    steps.forEach(step => {
      const place = getPlace(step);
      if (!place) return;
      const day = getStepSchedule(step);
      const color = selected === step.id ? '#b75b38' : day.precision === 'undecided' ? '#35695d' : '#556ca1';
      const title = step.title.trim() || '名称未設定';
      const html = '<span class="atelier-marker-pin" style="background:' + color + '"><span class="atelier-marker-symbol" aria-hidden="true">' + escapeHtml(getStepTypeIcon(step.type)) + '</span>' +
        '</span><span class="atelier-marker-label' + (selected === step.id ? ' is-selected' : '') + '">' + escapeHtml(title) + '</span>';
      const marker = L.marker([place.lat, place.lng], {
        title, keyboard: true, draggable: canEdit && !centerMode && !!onMove,
        icon: L.divIcon({ className: 'atelier-marker', html, iconSize: [38, 46], iconAnchor: [19, 46] }),
      }).addTo(layer);
      labelMarkers.push({ id: step.id, marker });
      marker.on('click', () => onSelect(step.id));
      marker.on('dragend', () => { const p = marker.getLatLng(); onMove?.(step.id, { lat: p.lat, lng: p.wrap().lng, priority: place.priority }); scheduleLabelLayout(); });
    });
    scheduleLabelLayout();
  });
  $effect(() => {
    if (!ready || !selected) return;
    const selectedStep = steps.find(s => s.id === selected);
    const place = selectedStep ? getPlace(selectedStep) : null;
    if (place) map?.panTo([place.lat, place.lng]);
  });
</script>
<div class="map-frame" class:adding>
  <div class="canvas" bind:this={container} aria-label="行きたい場所の地図"></div>
  {#if centerMode}<div class="center-pin" aria-hidden="true">📍</div>{/if}
  <div class="map-tools">
    <button onclick={fit} disabled={!ready}>全候補を表示</button>
    {#if canEdit && !centerMode}<button class:active={adding} disabled={!ready} onclick={() => adding = !adding}>{adding ? 'ピン追加をやめる' : '＋ 地図にピンを刺す'}</button>{/if}
  </div>
  {#if adding}<div class="map-hint" role="status">行きたい場所をタップ。<button onclick={() => { const p = map?.getCenter(); if (p) { onPin({ lat: p.lat, lng: p.wrap().lng }); adding = false; } }}>地図の中心に追加</button></div>{/if}
  {#if failed}<div class="map-error" role="status">地図を読み込めません。候補リストから計画を続けられます。<button onclick={() => { failed = false; tiles?.redraw(); }}>再試行</button></div>{/if}
  {#if !ready && !failed}<div class="map-hint">地図をひらいています…</div>{/if}
</div>
<style>
  .map-frame { position:relative; height:100%; min-height:460px; background:#e7ece1; isolation:isolate; border-radius:20px; overflow:hidden; }
  .canvas { position:absolute; inset:0; z-index:0; }
  .adding .canvas { cursor:crosshair; }
  .center-pin { position:absolute; z-index:2; top:50%; left:50%; transform:translate(-50%,-100%); font-size:36px; pointer-events:none; filter:drop-shadow(0 2px 3px #3338); }
  .map-tools { position:absolute; top:18px; right:18px; display:flex; gap:8px; z-index:2; }
  button { min-height:40px; padding:9px 13px; border:1px solid #d9dfd7; border-radius:9px; background:#fff; color:#294b42; font:inherit; font-size:12px; cursor:pointer; box-shadow:0 3px 12px #253e2910; }
  button.active { background:#35695d; color:white; }
  .map-hint,.map-error { position:absolute; top:75px; left:50%; transform:translateX(-50%); width:max-content; max-width:85%; padding:12px 16px; background:white; border-radius:12px; z-index:3; font-size:12px; box-shadow:0 3px 15px #0002; }
  .map-error { background:#fff5e5; }
  :global(.atelier-marker) { background:none; border:0; }
  :global(.atelier-marker .atelier-marker-pin) { display:grid; place-items:center; width:38px; height:38px; box-sizing:border-box; border:3px solid white; border-radius:50% 50% 50% 4px; color:white; box-shadow:0 3px 10px #213b3440; }
  :global(.atelier-marker .atelier-marker-symbol) { display:block; font-size:20px; line-height:1; }
  :global(.atelier-marker .atelier-marker-label) {
    position:absolute; top:4px; left:44px; display:block; width:max-content; max-width:min(168px, 42vw);
    overflow:hidden; text-overflow:ellipsis; white-space:nowrap; box-sizing:border-box;
    padding:7px 10px; border:1px solid #d7dfda; border-radius:10px;
    background:#fffefa; color:#27453d; box-shadow:0 2px 9px #172e2428;
    font-size:12px; font-weight:600; line-height:17px; pointer-events:auto;
  }
  :global(.atelier-marker .atelier-marker-label.is-left) { left:auto; right:44px; }
  :global(.atelier-marker .atelier-marker-label.is-hidden) { visibility:hidden; pointer-events:none; }
  :global(.atelier-marker[title] .atelier-marker-label) { cursor:pointer; }
  :global(.atelier-marker .atelier-marker-label.is-selected) { border-color:#b75b38; background:#fff9f4; }
  @media(max-width:700px) { .map-frame { min-height:360px; border-radius:14px; } .map-tools { top:12px; right:10px; gap:4px; } button { padding:8px; font-size:11px; } }
</style>
