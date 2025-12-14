<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Step } from "@tabitabi/types";
  import { browser } from "$app/environment";

  type MapStyle = "day" | "night" | "satellite" | "pixel";

  interface Props {
    steps: Step[];
    onStepClick?: (step: Step, index: number) => void;
    onMapClick?: (lat: number, lng: number) => void;
    showRoute?: boolean;
    mapStyle?: MapStyle;
    show3D?: boolean;
  }

  let {
    steps,
    onStepClick,
    onMapClick,
    showRoute = true,
    mapStyle = "night",
    show3D = true,
  }: Props = $props();

  let mapContainer: HTMLDivElement;
  let map: any = null;
  let mapboxgl: any = null;
  let markers: any[] = [];
  let errorMsg = $state("");
  let isLoaded = $state(false);
  let routeAnimationFrame: number | null = null;
  let isPixelMode = $state(false);

  function resolveAccessToken(): string | undefined {
    const fromImport =
      (import.meta.env.PUBLIC_MAPBOX_ACCESS_TOKEN as string | undefined) ||
      (import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined);
    if (fromImport) return fromImport;

    const fromProcess =
      typeof process !== "undefined"
        ? (process as any).env?.PUBLIC_MAPBOX_ACCESS_TOKEN ||
          (process as any).env?.VITE_MAPBOX_ACCESS_TOKEN
        : undefined;
    if (fromProcess) return fromProcess;

    if (typeof window !== "undefined") {
      const w = window as any;
      return (
        w.PUBLIC_MAPBOX_ACCESS_TOKEN ||
        w.VITE_MAPBOX_ACCESS_TOKEN ||
        w.env?.PUBLIC_MAPBOX_ACCESS_TOKEN ||
        w.env?.VITE_MAPBOX_ACCESS_TOKEN
      );
    }

    return undefined;
  }

  let mapboxAccessToken = $state<string | undefined>(resolveAccessToken());

  async function fetchTokenFromServer(): Promise<string | undefined> {
    try {
      const res = await fetch("/api/mapbox/token");
      if (res.ok) {
        const data = await res.json();
        return data.token;
      }
    } catch (e) {
      console.error("Failed to fetch Mapbox token from server", e);
    }
    return undefined;
  }

  const MAP_STYLES: Record<MapStyle, string> = {
    day: "mapbox://styles/mapbox/light-v11",
    night: "mapbox://styles/mapbox/dark-v11",
    satellite: "mapbox://styles/mapbox/satellite-streets-v12",
    pixel: "mapbox://styles/mapbox/streets-v12",
  };

  const DATE_COLORS = [
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#10B981",
    "#F59E0B",
    "#EF4444",
    "#3B82F6",
    "#6366F1",
  ];

  function getDateColor(date: string, uniqueDates: string[]): string {
    const index = uniqueDates.indexOf(date);
    return DATE_COLORS[index % DATE_COLORS.length];
  }

  function getSortedSteps(): Step[] {
    return [...steps].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  }

  function getUniqueDates(): string[] {
    return [...new Set(getSortedSteps().map((s) => s.date))];
  }

  async function geocodeLocation(
    location: string,
  ): Promise<[number, number] | null> {
    const cacheKey = `mapbox-geo:${location}`;
    const cached = sessionStorage.getItem(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    try {
      const response = await fetch(
        `/api/mapbox/geocode?query=${encodeURIComponent(location)}&limit=1`,
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        const coords: [number, number] = [lng, lat];
        sessionStorage.setItem(cacheKey, JSON.stringify(coords));
        return coords;
      }
    } catch (e) {
      console.error("Geocode failed for", location, e);
    }
    return null;
  }

  function createCustomMarker(
    color: string,
    number: number,
    isActive: boolean = false,
  ): HTMLElement {
    const el = document.createElement("div");
    el.className = isPixelMode
      ? "mapbox-custom-marker pixel"
      : "mapbox-custom-marker";
    el.innerHTML = isPixelMode
      ? `
        <div class="pixel-marker">
          <div class="pixel-top" style="background:${color}"></div>
          <div class="pixel-body" style="background:${color}">
            <span class="marker-number">${number}</span>
          </div>
          <div class="pixel-shadow" style="background:${color}99"></div>
        </div>
      `
      : `
        <div class="marker-pulse" style="background: ${color}50"></div>
        <div class="marker-ring" style="border-color: ${color}"></div>
        <div class="marker-outer" style="background: linear-gradient(145deg, ${color}, ${color}dd)">
          <span class="marker-number">${number}</span>
        </div>
        ${isActive ? '<div class="marker-glow" style="background: ' + color + '"></div>' : ""}
      `;
    return el;
  }

  async function initMap() {
    if (!browser) return;

    if (!mapboxAccessToken) {
      mapboxAccessToken = await fetchTokenFromServer();
    }

    if (!mapboxAccessToken) {
      errorMsg = "Mapbox Access Token is missing.";
      return;
    }

    try {
      mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");

      mapboxgl.accessToken = mapboxAccessToken;

      map = new mapboxgl.Map({
        container: mapContainer,
        style: MAP_STYLES[mapStyle],
        center: [139.7671, 35.6812],
        zoom: 2,
        pitch: show3D ? 45 : 0,
        bearing: 0,
        projection: "globe",
        antialias: true,
      });

      map.on("style.load", () => {
        applySceneStyling();
        updateMarkers();
      });

      map.on("load", () => {
        isLoaded = true;
        updateMarkers();
      });

      map.on("click", (e: any) => {
        if (onMapClick) {
          onMapClick(e.lngLat.lat, e.lngLat.lng);
        }
      });

      map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    } catch (e) {
      console.error("Failed to initialize Mapbox:", e);
      errorMsg = "Failed to load Mapbox. Please check your access token.";
    }
  }

  async function updateMarkers() {
    if (!map || !mapboxgl || !isLoaded) return;

    markers.forEach((m) => m.remove());
    markers = [];

    if (map.getSource("route")) {
      map.removeLayer("route-line");
      map.removeLayer("route-line-glow");
      map.removeLayer("route-animation");
      map.removeSource("route");
    }

    const sortedSteps = getSortedSteps();
    const uniqueDates = getUniqueDates();
    const coordinates: [number, number][] = [];
    const bounds = new mapboxgl.LngLatBounds();
    let hasPoints = false;

    let stepNumber = 1;
    for (const step of sortedSteps) {
      if (!step.location) {
        stepNumber++;
        continue;
      }

      const coords = await geocodeLocation(step.location);
      if (coords) {
        const color = getDateColor(step.date, uniqueDates);
        const currentNumber = stepNumber;
        const originalIndex = steps.findIndex((s) => s.id === step.id);

        const markerEl = createCustomMarker(color, currentNumber);
        markerEl.style.cursor = "pointer";
        markerEl.addEventListener("click", (e) => {
          e.stopPropagation();
          if (onStepClick) {
            onStepClick(step, originalIndex);
            flyToStep(coords, currentNumber);
          }
        });

        const marker = new mapboxgl.Marker({
          element: markerEl,
          anchor: "center",
        })
          .setLngLat(coords)
          .addTo(map);

        markers.push(marker);
        coordinates.push(coords);
        bounds.extend(coords);
        hasPoints = true;
      }
      stepNumber++;
    }

    if (hasPoints && showRoute && coordinates.length > 1) {
      addAnimatedRoute(coordinates);
    }

    if (hasPoints) {
      map.fitBounds(bounds, {
        padding: { top: 100, bottom: 150, left: 50, right: 50 },
        maxZoom: 15,
        duration: 2000,
        essential: true,
      });
    }
  }

  function addAnimatedRoute(coordinates: [number, number][]) {
    try {
      map.addSource("route", {
        type: "geojson",
        lineMetrics: true,
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coordinates,
          },
        },
      });

      map.addLayer({
        id: "route-line-glow",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#8B5CF6",
          "line-width": 16,
          "line-opacity": 0.25,
          "line-blur": 12,
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": isPixelMode ? "#ffd166" : "#A855F7",
          "line-width": isPixelMode ? 6 : 5,
          "line-opacity": 0.95,
        },
      });

      map.addLayer({
        id: "route-animation",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": isPixelMode ? "#fff7ed" : "#ffffff",
          "line-width": isPixelMode ? 3 : 2.5,
          "line-dasharray": isPixelMode ? [1, 0, 0] : [0, 4, 3],
          "line-opacity": 0.8,
        },
      });

      animateRoute();
    } catch (e) {
      console.warn("Route layer error:", e);
    }
  }

  function animateRoute() {
    if (!map) return;

    let dashArraySeq = [
      [0, 4, 3],
      [1, 4, 2],
      [2, 4, 1],
      [3, 4, 0],
      [0, 1, 3, 3],
      [0, 2, 3, 2],
      [0, 3, 3, 1],
    ];
    let step = 0;

    function animate() {
      if (!map || !map.getLayer("route-animation")) return;

      map.setPaintProperty(
        "route-animation",
        "line-dasharray",
        dashArraySeq[step],
      );
      step = (step + 1) % dashArraySeq.length;
      routeAnimationFrame = requestAnimationFrame(() =>
        setTimeout(animate, 100),
      );
    }

    animate();
  }

  function flyToStep(coords: [number, number], stepNumber: number) {
    if (!map) return;

    map.flyTo({
      center: coords,
      zoom: 16,
      pitch: show3D ? 60 : 0,
      bearing: stepNumber * 15,
      duration: 2000,
      essential: true,
    });
  }

  export function changeMapStyle(style: MapStyle) {
    if (!map) return;
    map.setStyle(MAP_STYLES[style]);
  }

  export function flyToAllSteps() {
    if (!map || markers.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    markers.forEach((m) => bounds.extend(m.getLngLat()));

    map.fitBounds(bounds, {
      padding: { top: 100, bottom: 150, left: 50, right: 50 },
      maxZoom: 15,
      duration: 2000,
    });
  }

  onMount(() => {
    initMap();
  });

  onDestroy(() => {
    if (routeAnimationFrame) {
      cancelAnimationFrame(routeAnimationFrame);
    }
    if (map) {
      map.remove();
    }
  });

  $effect(() => {
    if (isLoaded && steps) {
      updateMarkers();
    }
  });

  $effect(() => {
    if (!map || !isLoaded) return;
    isPixelMode = mapStyle === "pixel";

    map.once("style.load", () => {
      applySceneStyling();
      updateMarkers();
    });
    map.setStyle(MAP_STYLES[mapStyle]);
  });

  $effect(() => {
    if (!map || !isLoaded) return;
    applySceneStyling();
  });

  $effect(() => {
    const _ = showRoute;
    if (!map || !isLoaded) return;
    updateMarkers();
  });

  function applySceneStyling() {
    if (!map) return;

    if (map.getLayer("3d-buildings")) {
      map.removeLayer("3d-buildings");
    }

    map.setPitch(show3D ? 45 : 0);

    map.setFog({
      color: mapStyle === "night" ? "rgb(20, 20, 40)" : "rgb(220, 230, 240)",
      "high-color":
        mapStyle === "night" ? "rgb(36, 36, 73)" : "rgb(180, 200, 220)",
      "horizon-blend": 0.1,
      "space-color":
        mapStyle === "night" ? "rgb(10, 10, 30)" : "rgb(200, 210, 230)",
      "star-intensity": mapStyle === "night" ? 0.8 : 0,
    });

    if (show3D && mapStyle !== "satellite" && mapStyle !== "pixel") {
      const layers = map.getStyle().layers;
      const labelLayerId = layers?.find(
        (layer: any) => layer.type === "symbol" && layer.layout?.["text-field"],
      )?.id;

      map.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 14,
          paint: {
            "fill-extrusion-color": mapStyle === "night" ? "#1a1a2e" : "#aaa",
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              0,
              14.5,
              ["get", "height"],
            ],
            "fill-extrusion-base": [
              "interpolate",
              ["linear"],
              ["zoom"],
              14,
              0,
              14.5,
              ["get", "min_height"],
            ],
            "fill-extrusion-opacity": 0.7,
          },
        },
        labelLayerId,
      );
    }
  }
</script>

<div
  class="mapbox-container {mapStyle === 'pixel' ? 'pixel-map' : ''}"
  bind:this={mapContainer}
>
  {#if !isLoaded && !errorMsg}
    <div class="map-loading">
      <div class="loading-orbit">
        <div class="orbit-dot"></div>
      </div>
      <div class="loading-globe">🌍</div>
      <span class="loading-text">Preparing your journey...</span>
    </div>
  {/if}

  {#if errorMsg}
    <div class="error-overlay">
      <div class="error-icon">⚠️</div>
      <p>{errorMsg}</p>
    </div>
  {/if}
</div>

<style>
  .mapbox-container {
    width: 100%;
    height: 100%;
    min-height: 100vh;
    position: relative;
  }

  .pixel-map {
    background: linear-gradient(135deg, #0b1224, #111827);
  }

  .pixel-map :global(.mapboxgl-canvas) {
    image-rendering: pixelated;
    filter: saturate(1.2) contrast(1.35) brightness(1.05);
  }

  .pixel-map::after {
    content: "";
    position: absolute;
    inset: 0;
    background-image: linear-gradient(
        to right,
        rgba(255, 255, 255, 0.04) 1px,
        transparent 1px
      ),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
    background-size: 16px 16px;
    pointer-events: none;
    mix-blend-mode: soft-light;
    z-index: 2;
  }

  .map-loading {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
    color: #e2e8f0;
    gap: 24px;
    z-index: 10;
  }

  .loading-orbit {
    position: absolute;
    width: 120px;
    height: 120px;
    border: 2px solid rgba(139, 92, 246, 0.2);
    border-radius: 50%;
    animation: orbit-rotate 3s linear infinite;
  }

  .orbit-dot {
    position: absolute;
    top: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 12px;
    height: 12px;
    background: linear-gradient(135deg, #8b5cf6, #ec4899);
    border-radius: 50%;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.8);
  }

  @keyframes orbit-rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .loading-globe {
    font-size: 48px;
    animation: globe-pulse 2s ease-in-out infinite;
  }

  @keyframes globe-pulse {
    0%,
    100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }

  .loading-text {
    font-size: 14px;
    color: #94a3b8;
    letter-spacing: 1px;
  }

  .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%);
    color: #f87171;
    font-weight: 500;
    z-index: 10;
    text-align: center;
    padding: 24px;
  }

  .error-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  :global(.mapbox-custom-marker) {
    position: relative;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  :global(.marker-pulse) {
    position: absolute;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    animation: pulse 2.5s ease-out infinite;
  }

  :global(.marker-ring) {
    position: absolute;
    width: 48px;
    height: 48px;
    border: 2px solid;
    border-radius: 50%;
    opacity: 0.4;
    animation: ring-expand 2.5s ease-out infinite;
  }

  @keyframes pulse {
    0% {
      transform: scale(0.8);
      opacity: 0.8;
    }
    100% {
      transform: scale(2.2);
      opacity: 0;
    }
  }

  @keyframes ring-expand {
    0% {
      transform: scale(1);
      opacity: 0.6;
    }
    100% {
      transform: scale(1.8);
      opacity: 0;
    }
  }

  :global(.marker-outer) {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.4),
      0 0 30px rgba(139, 92, 246, 0.4),
      inset 0 -2px 6px rgba(0, 0, 0, 0.2);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 2;
    border: 2px solid rgba(255, 255, 255, 0.3);
  }

  :global(.mapbox-custom-marker:hover .marker-outer) {
    transform: scale(1.2);
    box-shadow:
      0 8px 30px rgba(0, 0, 0, 0.5),
      0 0 50px rgba(139, 92, 246, 0.6);
  }

  :global(.marker-number) {
    font-size: 16px;
    font-weight: 800;
    color: white;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  :global(.mapbox-custom-marker.pixel) {
    width: 48px;
    height: 56px;
  }

  :global(.pixel-marker) {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    filter: drop-shadow(0 4px 0 rgba(0, 0, 0, 0.4));
  }

  :global(.pixel-top) {
    width: 28px;
    height: 8px;
    border: 2px solid rgba(0, 0, 0, 0.25);
    box-sizing: border-box;
  }

  :global(.pixel-body) {
    width: 34px;
    height: 28px;
    border: 2px solid rgba(0, 0, 0, 0.25);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: #0f172a;
    text-shadow: none;
  }

  :global(.pixel-shadow) {
    width: 32px;
    height: 6px;
    opacity: 0.6;
  }

  :global(.marker-glow) {
    position: absolute;
    width: 70px;
    height: 70px;
    border-radius: 50%;
    opacity: 0.4;
    filter: blur(18px);
    z-index: 0;
  }

  :global(.mapboxgl-ctrl-group) {
    background: rgba(15, 23, 42, 0.92) !important;
    border: 1px solid rgba(139, 92, 246, 0.3) !important;
    border-radius: 14px !important;
    overflow: hidden;
    backdrop-filter: blur(12px);
    box-shadow:
      0 4px 20px rgba(0, 0, 0, 0.3),
      0 0 30px rgba(139, 92, 246, 0.1);
  }

  :global(.mapboxgl-ctrl-group button) {
    background: transparent !important;
    border: none !important;
    width: 36px !important;
    height: 36px !important;
  }

  :global(.mapboxgl-ctrl-group button:hover) {
    background: rgba(139, 92, 246, 0.25) !important;
  }

  :global(.mapboxgl-ctrl-group button span) {
    filter: invert(1);
  }

  :global(.mapboxgl-ctrl-attrib) {
    background: rgba(15, 23, 42, 0.8) !important;
    backdrop-filter: blur(8px);
    border-radius: 8px !important;
    padding: 4px 8px !important;
  }

  :global(.mapboxgl-ctrl-attrib a) {
    color: #94a3b8 !important;
    font-size: 10px !important;
  }
</style>
