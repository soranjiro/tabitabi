<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { MapCandidate, MapPoint } from "../model";

  interface Props {
    candidates: MapCandidate[];
    scheduledPoints: MapPoint[];
    selectedCandidateId?: string | null;
    onMapClick?: (lat: number, lng: number) => void;
    onCandidateClick?: (candidateId: string) => void;
  }

  let {
    candidates,
    scheduledPoints,
    selectedCandidateId = null,
    onMapClick,
    onCandidateClick,
  }: Props = $props();

  const MAPLIBRE_VERSION = "5.11.0";
  const MAPLIBRE_SCRIPT = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.js`;
  const MAPLIBRE_CSS = `https://unpkg.com/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
  const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

  let mapElement: HTMLDivElement;
  let map: any = null;
  let maplibregl: any = null;
  let markers: any[] = [];
  let loaded = $state(false);
  let errorMessage = $state("");

  function loadMapLibre(): Promise<any> {
    if (typeof window === "undefined") return Promise.reject(new Error("Map is browser-only"));
    const globalWindow = window as any;
    if (globalWindow.maplibregl) return Promise.resolve(globalWindow.maplibregl);
    if (globalWindow.__tabitabiMapLibrePromise) return globalWindow.__tabitabiMapLibrePromise;

    globalWindow.__tabitabiMapLibrePromise = new Promise((resolve, reject) => {
      if (!document.querySelector(`link[data-tabitabi-maplibre="${MAPLIBRE_VERSION}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = MAPLIBRE_CSS;
        link.dataset.tabitabiMaplibre = MAPLIBRE_VERSION;
        document.head.appendChild(link);
      }

      const existingScript = document.querySelector<HTMLScriptElement>(
        `script[data-tabitabi-maplibre="${MAPLIBRE_VERSION}"]`,
      );
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(globalWindow.maplibregl), { once: true });
        existingScript.addEventListener("error", () => reject(new Error("MapLibre failed to load")), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = MAPLIBRE_SCRIPT;
      script.async = true;
      script.dataset.tabitabiMaplibre = MAPLIBRE_VERSION;
      script.onload = () => resolve(globalWindow.maplibregl);
      script.onerror = () => reject(new Error("MapLibre failed to load"));
      document.head.appendChild(script);
    });

    return globalWindow.__tabitabiMapLibrePromise;
  }

  function makeCandidateMarker(candidate: MapCandidate): HTMLElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `trip-map-marker candidate${candidate.id === selectedCandidateId ? " selected" : ""}`;
    button.setAttribute("aria-label", candidate.title);
    button.innerHTML = '<span class="trip-map-marker-dot"></span>';
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      onCandidateClick?.(candidate.id);
    });
    return button;
  }

  function makeScheduledMarker(point: MapPoint, index: number): HTMLElement {
    const marker = document.createElement("div");
    marker.className = "trip-map-marker scheduled";
    marker.setAttribute("aria-label", point.title);
    marker.textContent = point.label ?? String(index + 1);
    return marker;
  }

  function clearMarkers() {
    markers.forEach((marker) => marker.remove());
    markers = [];
  }

  function removeRoute() {
    if (!map) return;
    if (map.getLayer("tabitabi-route")) map.removeLayer("tabitabi-route");
    if (map.getSource("tabitabi-route")) map.removeSource("tabitabi-route");
  }

  function drawRoute() {
    removeRoute();
    if (!map || scheduledPoints.length < 2) return;

    map.addSource("tabitabi-route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: scheduledPoints.map((point) => [point.lng, point.lat]),
        },
      },
    });

    map.addLayer({
      id: "tabitabi-route",
      type: "line",
      source: "tabitabi-route",
      layout: {
        "line-cap": "round",
        "line-join": "round",
      },
      paint: {
        "line-color": "#2563eb",
        "line-width": 3,
        "line-opacity": 0.6,
        "line-dasharray": [1.5, 1.5],
      },
    });
  }

  function fitAllPoints() {
    if (!map || !maplibregl) return;
    const allPoints = [
      ...candidates.map((candidate) => ({ lat: candidate.lat, lng: candidate.lng })),
      ...scheduledPoints,
    ];
    if (allPoints.length === 0) return;

    if (allPoints.length === 1) {
      map.easeTo({ center: [allPoints[0].lng, allPoints[0].lat], zoom: 14, duration: 450 });
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    allPoints.forEach((point) => bounds.extend([point.lng, point.lat]));
    map.fitBounds(bounds, {
      padding: { top: 72, right: 36, bottom: 180, left: 36 },
      maxZoom: 14,
      duration: 450,
    });
  }

  function refreshMap() {
    if (!loaded || !map || !maplibregl) return;
    clearMarkers();

    candidates.forEach((candidate) => {
      const marker = new maplibregl.Marker({ element: makeCandidateMarker(candidate), anchor: "bottom" })
        .setLngLat([candidate.lng, candidate.lat])
        .addTo(map);
      markers.push(marker);
    });

    scheduledPoints.forEach((point, index) => {
      const marker = new maplibregl.Marker({ element: makeScheduledMarker(point, index), anchor: "center" })
        .setLngLat([point.lng, point.lat])
        .addTo(map);
      markers.push(marker);
    });

    drawRoute();
    fitAllPoints();
  }

  async function initializeMap() {
    try {
      maplibregl = await loadMapLibre();
      if (!maplibregl) throw new Error("MapLibre is unavailable");

      map = new maplibregl.Map({
        container: mapElement,
        style: MAP_STYLE,
        center: [139.7671, 35.6812],
        zoom: 11,
        attributionControl: false,
      });

      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
      map.on("click", (event: any) => onMapClick?.(event.lngLat.lat, event.lngLat.lng));
      map.on("load", () => {
        loaded = true;
        refreshMap();
      });
      map.on("error", (event: any) => {
        if (!loaded) errorMessage = event?.error?.message ?? "地図を読み込めませんでした";
      });
    } catch (error) {
      console.error("Failed to initialize trip map", error);
      errorMessage = "地図を読み込めませんでした。候補一覧はそのまま利用できます。";
    }
  }

  onMount(() => {
    void initializeMap();
  });

  onDestroy(() => {
    clearMarkers();
    removeRoute();
    map?.remove();
    map = null;
  });

  $effect(() => {
    candidates;
    scheduledPoints;
    if (loaded) refreshMap();
  });

  $effect(() => {
    const selectedId = selectedCandidateId;
    if (!loaded || !map || !selectedId) return;
    const candidate = candidates.find((item) => item.id === selectedId);
    if (candidate) {
      map.easeTo({ center: [candidate.lng, candidate.lat], zoom: Math.max(map.getZoom(), 14), duration: 350 });
    }
    refreshMap();
  });
</script>

<div class="map-shell" bind:this={mapElement} aria-label="旅行候補マップ">
  {#if errorMessage}
    <div class="map-error" role="status">{errorMessage}</div>
  {/if}
  {#if !loaded && !errorMessage}
    <div class="map-loading" aria-live="polite">
      <span></span>
      地図を読み込み中
    </div>
  {/if}
</div>

<style>
  .map-shell {
    position: absolute;
    inset: 0;
    min-height: 320px;
    background: #edf1f4;
  }

  .map-loading,
  .map-error {
    position: absolute;
    z-index: 5;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    max-width: min(320px, calc(100% - 48px));
    align-items: center;
    gap: 10px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.94);
    padding: 12px 16px;
    color: #475569;
    font-size: 13px;
    box-shadow: 0 8px 28px rgba(15, 23, 42, 0.12);
  }

  .map-loading span {
    width: 14px;
    height: 14px;
    border: 2px solid #cbd5e1;
    border-top-color: #2563eb;
    border-radius: 999px;
    animation: spin 0.8s linear infinite;
  }

  :global(.trip-map-marker) {
    appearance: none;
    border: 0;
    font: inherit;
    box-sizing: border-box;
  }

  :global(.trip-map-marker.candidate) {
    position: relative;
    width: 34px;
    height: 42px;
    cursor: pointer;
    border-radius: 18px 18px 18px 4px;
    transform: rotate(-45deg);
    background: #ffffff;
    border: 2px solid #2563eb;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.22);
  }

  :global(.trip-map-marker.candidate.selected) {
    width: 39px;
    height: 47px;
    border-width: 3px;
    box-shadow: 0 0 0 5px rgba(37, 99, 235, 0.18), 0 7px 18px rgba(15, 23, 42, 0.24);
  }

  :global(.trip-map-marker-dot) {
    position: absolute;
    width: 10px;
    height: 10px;
    left: 50%;
    top: 50%;
    border-radius: 999px;
    background: #2563eb;
    transform: translate(-50%, -50%);
  }

  :global(.trip-map-marker.scheduled) {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 999px;
    background: #2563eb;
    border: 3px solid #ffffff;
    color: white;
    font-size: 12px;
    font-weight: 800;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
  }

  :global(.maplibregl-ctrl-top-right) {
    top: 64px;
    right: 8px;
  }

  :global(.maplibregl-ctrl-group) {
    border-radius: 12px !important;
    overflow: hidden;
  }

  :global(.maplibregl-ctrl-attrib) {
    font-size: 9px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
