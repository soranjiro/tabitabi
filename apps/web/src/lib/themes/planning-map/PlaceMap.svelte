<script lang="ts">
  import { onMount } from 'svelte';
  import { env } from '$env/dynamic/public';
  import type { Step } from '@tabitabi/types';
  import type * as Leaflet from 'leaflet';
  import { getPlace, type Place } from '$lib/planning/places';
  import { getStepSchedule } from '$lib/planning/schedule';
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
  const escapeHtml = (text: string) => text.replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[char] ?? char);
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
  const svg = (content: string) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${content}</svg>`;
  function stepIcon(type: Step['type']): string {
    switch (type) {
      case 'normal:food': case 'normal:meal': return svg('<circle cx="12" cy="14" r="6"/><path d="M6 14h12M12 8v12"/><path d="M3 3v7M5 3v7M3 7h2M5 10v11"/><path d="M19 3v18M19 3c2 2 2 5 0 7"/>');
      case 'normal:hotel': return svg('<path d="M3 19V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12M3 14h18M3 19h18"/><path d="M6 14v-3h5a2 2 0 0 1 2 2v1M17 14v-2a2 2 0 0 0-2-2h-2"/>');
      case 'normal:sightseeing': return svg('<path d="M3 21h18M5 21V10l7-5 7 5v11M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01"/>');
      case 'normal:shopping': return svg('<path d="M6 7h12l-1 12H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/><path d="M8 11h8"/>');
      case 'transport:train': return svg('<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 12h16M8 18l-2 3M16 18l2 3M8 7h.01M16 7h.01M8 22h8"/>');
      case 'transport:car': case 'transport:general': return svg('<rect x="3" y="5" width="18" height="10" rx="2"/><circle cx="7" cy="18" r="1"/><circle cx="17" cy="18" r="1"/><path d="M3 5v13M21 5v13"/>');
      case 'transport:plane': return svg('<path d="M2 16l8-2V4a2 2 0 0 1 4 0v10l8 2v2l-8-1v3l2 1v1H8v-1l2-1v-3l-8 1z"/>');
      case 'transport:bus': return svg('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M7 10h.01M17 10h.01"/><path d="M5 19h14"/><circle cx="6" cy="19" r="1"/><circle cx="18" cy="19" r="1"/><path d="M2 6v2h20V6"/>');
      case 'transport:ship': return svg('<path d="M3 17h18l-2-6H5l-2 6z"/><path d="M7 11l5-6 5 6"/><path d="M12 5v6"/><path d="M2 19h20"/><path d="M6 21h4"/><path d="M14 21h4"/>');
      default: return svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>');
    }
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
      const html = '<span class="atelier-marker-pin" style="background:' + color + '">' + stepIcon(step.type) +
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
  :global(.atelier-marker .atelier-marker-pin svg) { width:19px; height:19px; }
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
