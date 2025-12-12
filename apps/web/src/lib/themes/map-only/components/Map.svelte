<script lang="ts">
  import { onMount } from "svelte";
  import type { Step } from "@tabitabi/types";
  import { setOptions, importLibrary } from "@googlemaps/js-api-loader";

  interface Props {
    steps: Step[];
    onStepClick?: (step: Step, index: number) => void;
    onMapClick?: (lat: number, lng: number) => void;
    showRoute?: boolean;
    onOpenStreetView?: (lat: number, lng: number, title: string) => void;
    selectedStepId?: string | null;
  }

  let {
    steps,
    onStepClick,
    onMapClick,
    showRoute = false,
    onOpenStreetView,
    selectedStepId = null,
  }: Props = $props();
  let mapElement: HTMLDivElement;
  let map: google.maps.Map | null = null;
  let markers: google.maps.Marker[] = [];
  let routeRenderers: google.maps.DirectionsRenderer[] = [];
  let errorMsg = $state("");
  let MarkerClass: typeof google.maps.Marker | null = null;
  let directionsService: google.maps.DirectionsService | null = null;
  let apiInitialized = false;

  export function openStreetViewAt(lat: number, lng: number) {
    if (!map) return;
    const panorama = map.getStreetView();
    panorama.setOptions({
      position: { lat, lng },
      pov: { heading: 0, pitch: 0 },
      linksControl: true,
      clickToGo: true,
      addressControl: true,
      enableCloseButton: true,
      panControl: true,
      zoomControl: true,
    });
    panorama.setVisible(true);
  }

  export function closeStreetView() {
    if (!map) return;
    const panorama = map.getStreetView();
    panorama.setVisible(false);
  }

  export function getLocationForStep(
    step: Step,
  ): google.maps.LatLngLiteral | null {
    const cacheKey = `geo:${step.location}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }

  export function focusOnStep(stepId: string) {
    if (!map) return;
    const step = steps.find((s) => s.id === stepId);
    if (!step || !step.location) return;

    const location = getLocationForStep(step);
    if (location) {
      map.setCenter(location);
      map.setZoom(15);

      const marker = markers.find((m) => m.getTitle() === step.title);
      if (marker) {
        marker.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout(() => {
          marker.setAnimation(null);
        }, 2000);
      }
    }
  }

  const DATE_COLORS = [
    "#4285F4",
    "#EA4335",
    "#34A853",
    "#FBBC05",
    "#9C27B0",
    "#00BCD4",
    "#FF5722",
    "#607D8B",
  ];

  const apiKey =
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
    import.meta.env.PUBLIC_GOOGLE_MAPS_API_KEY;

  function getDateColor(date: string, uniqueDates: string[]): string {
    const index = uniqueDates.indexOf(date);
    return DATE_COLORS[index % DATE_COLORS.length];
  }

  function createMarkerIcon(color: string): google.maps.Symbol {
    return {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      scale: 16,
    };
  }

  onMount(async () => {
    if (!apiKey) {
      errorMsg =
        "API Key is missing. Please set PUBLIC_GOOGLE_MAPS_API_KEY in .env file.";
      console.error(errorMsg);
      return;
    }

    const keyStatus =
      apiKey.length > 10
        ? `(Key starts with ${apiKey.substring(0, 4)}...)`
        : "(Key is too short)";
    console.log(`Attempting to load Google Maps with key: ${keyStatus}`);

    try {
      if (!apiInitialized) {
        setOptions({ key: apiKey, v: "weekly" });
        apiInitialized = true;
      }

      const mapsLib = (await importLibrary("maps")) as google.maps.MapsLibrary;
      const markerLib = (await importLibrary(
        "marker",
      )) as google.maps.MarkerLibrary;

      const { Map } = mapsLib;
      MarkerClass = markerLib.Marker;

      map = new Map(mapElement, {
        center: { lat: 35.6812, lng: 139.7671 },
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }],
          },
        ],
      });

      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (e.latLng && onMapClick) {
          onMapClick(e.latLng.lat(), e.latLng.lng());
        }
      });

      await updateMap(map, MarkerClass);
    } catch (e: unknown) {
      console.error("Failed to load Google Maps", e);
      const keyHint = apiKey
        ? `Key present (${apiKey.substring(0, 4)}...)`
        : "No Key";
      const message = e instanceof Error ? e.message : String(e);
      errorMsg = `Failed to load Google Maps API. ${message} [${keyHint}]`;
    }
  });

  $effect(() => {
    if (map && steps) {
      updateMapWithCurrentState();
    }
  });

  $effect(() => {
    if (map && selectedStepId) {
      focusOnStep(selectedStepId);
    }
  });

  async function updateMapWithCurrentState() {
    if (!map) return;
    if (!MarkerClass) {
      const markerLib = (await importLibrary(
        "marker",
      )) as google.maps.MarkerLibrary;
      MarkerClass = markerLib.Marker;
    }
    await updateMap(map, MarkerClass);
  }

  async function updateMap(
    mapInstance: google.maps.Map,
    Marker: typeof google.maps.Marker,
  ) {
    markers.forEach((m) => m.setMap(null));
    markers = [];
    routeRenderers.forEach((r) => r.setMap(null));
    routeRenderers = [];

    const sortedSteps = [...steps].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    const uniqueDates = [...new Set(sortedSteps.map((s) => s.date))];

    const path: google.maps.LatLngLiteral[] = [];
    const bounds = new google.maps.LatLngBounds();
    let hasPoints = false;

    const geocoder = new google.maps.Geocoder();

    let stepNumber = 1;
    for (const step of sortedSteps) {
      if (!step.location) {
        stepNumber++;
        continue;
      }

      const cacheKey = `geo:${step.location}`;
      const cached = sessionStorage.getItem(cacheKey);

      let location: google.maps.LatLngLiteral | null = null;

      if (cached) {
        location = JSON.parse(cached);
      } else {
        try {
          const res = await geocoder.geocode({ address: step.location });
          if (res.results && res.results[0]) {
            location = {
              lat: res.results[0].geometry.location.lat(),
              lng: res.results[0].geometry.location.lng(),
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(location));
          }
        } catch (e) {
          console.error("Geocode failed for", step.location, e);
        }
      }

      if (location) {
        const color = getDateColor(step.date, uniqueDates);
        const currentNumber = stepNumber;
        const originalIndex = steps.findIndex((s) => s.id === step.id);

        const marker = new Marker({
          position: location,
          map: mapInstance,
          title: step.title,
          icon: createMarkerIcon(color),
          label: {
            text: String(currentNumber),
            color: "white",
            fontSize: "11px",
            fontWeight: "bold",
          },
        });

        marker.addListener("click", () => {
          if (onStepClick) onStepClick(step, originalIndex);
        });

        markers.push(marker);
        path.push(location);
        bounds.extend(location);
        hasPoints = true;
      }
      stepNumber++;
    }

    if (hasPoints && showRoute && path.length > 1) {
      await drawRouteWithDirections(mapInstance, path);
    }

    if (hasPoints) {
      mapInstance.fitBounds(bounds, 50);
    }
  }

  async function drawRouteWithDirections(
    mapInstance: google.maps.Map,
    path: google.maps.LatLngLiteral[],
  ) {
    if (!directionsService) {
      const routesLib = await importLibrary("routes");
      directionsService = new (routesLib as any).DirectionsService();
    }

    if (!directionsService) return;

    const MAX_WAYPOINTS = 25;
    for (let i = 0; i < path.length - 1; i += MAX_WAYPOINTS) {
      const segmentEnd = Math.min(i + MAX_WAYPOINTS, path.length - 1);
      const origin = path[i];
      const destination = path[segmentEnd];
      const waypoints: google.maps.DirectionsWaypoint[] = [];

      for (let j = i + 1; j < segmentEnd; j++) {
        waypoints.push({
          location: new google.maps.LatLng(path[j].lat, path[j].lng),
          stopover: true,
        });
      }

      try {
        const result = await directionsService.route({
          origin: new google.maps.LatLng(origin.lat, origin.lng),
          destination: new google.maps.LatLng(destination.lat, destination.lng),
          waypoints: waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
        });

        const renderer = new google.maps.DirectionsRenderer({
          map: mapInstance,
          directions: result,
          suppressMarkers: true,
          polylineOptions: {
            strokeColor: "#4285F4",
            strokeOpacity: 0.8,
            strokeWeight: 4,
          },
        });
        routeRenderers.push(renderer);
      } catch (e) {
        console.error("Directions request failed, falling back to polyline", e);
        const polyline = new google.maps.Polyline({
          path: path.slice(i, segmentEnd + 1),
          geodesic: true,
          strokeColor: "#666666",
          strokeOpacity: 0.8,
          strokeWeight: 3,
        });
        polyline.setMap(mapInstance);
      }
    }
  }
</script>

<div class="map-container" bind:this={mapElement}>
  {#if errorMsg}
    <div class="error-overlay">
      <p>{errorMsg}</p>
    </div>
  {/if}
</div>

<style>
  .map-container {
    width: 100%;
    height: 100%;
    min-height: 100vh;
    position: relative;
  }
  .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #f8f9fa;
    color: #dc3545;
    font-weight: bold;
    z-index: 10;
  }
</style>
