<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount, tick } from "svelte";
  import { prefectures, type ExplorePrefecture } from "./data";

  let {
    activeSlug = "",
    counts = {},
  }: { activeSlug?: string; counts?: Record<string, number> } = $props();

  let mapHost = $state<HTMLDivElement | null>(null);
  let mapMarkup = $state("");
  let focused = $state<ExplorePrefecture | null>(
    prefectures.find((item) => item.slug === activeSlug) ?? null,
  );
  let removeNodeListeners: (() => void)[] = [];

  function clearNodeListeners() {
    removeNodeListeners.forEach((remove) => remove());
    removeNodeListeners = [];
  }

  function makeInteractive() {
    clearNodeListeners();
    if (!mapHost) return;

    for (const node of mapHost.querySelectorAll<SVGGElement>(".prefecture")) {
      const prefecture = prefectures.find((item) => item.id === Number(node.dataset.code));
      if (!prefecture) continue;

      node.setAttribute("role", "link");
      node.setAttribute("tabindex", "0");
      node.setAttribute("aria-label", `${prefecture.name}の旅行しおり ${counts[prefecture.slug] ?? 0}件`);
      node.classList.toggle("is-active", prefecture.slug === activeSlug);

      const preview = () => (focused = prefecture);
      const select = () => void goto(`/area/${prefecture.slug}`);
      const keyboard = (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select();
        }
      };

      node.addEventListener("mouseenter", preview);
      node.addEventListener("focus", preview);
      node.addEventListener("click", select);
      node.addEventListener("keydown", keyboard);
      removeNodeListeners.push(() => {
        node.removeEventListener("mouseenter", preview);
        node.removeEventListener("focus", preview);
        node.removeEventListener("click", select);
        node.removeEventListener("keydown", keyboard);
      });
    }
  }

  async function loadMap(useMobileMap: boolean) {
    const response = await fetch(
      useMobileMap ? "/maps/japan-prefectures-mobile.svg" : "/maps/japan-prefectures.svg",
    );
    mapMarkup = await response.text();
    await tick();
    makeInteractive();
  }

  onMount(() => {
    const media = window.matchMedia("(max-width: 640px)");
    void loadMap(media.matches);
    const handleChange = (event: MediaQueryListEvent) => void loadMap(event.matches);
    media.addEventListener("change", handleChange);
    return () => {
      clearNodeListeners();
      media.removeEventListener("change", handleChange);
    };
  });
</script>

<div class="map-shell">
  <div class="map-copy">
    <strong>{focused?.name ?? "都道府県を選択"}</strong>
    <span>{focused ? `${counts[focused.slug] ?? 0}件の公開しおり` : "地図をタップして探せます"}</span>
  </div>
  <div class="map-host" bind:this={mapHost} aria-label="47都道府県から選べる日本地図">
    {@html mapMarkup}
  </div>
  <p class="attribution">
    地図データ: <a href="https://github.com/geolonia/japanese-prefectures" rel="noreferrer">Geolonia</a> / Wikipedia (GFDL)
  </p>
</div>

<style>
  .map-shell {
    overflow: hidden;
    border: 1px solid #e1e8f4;
    border-radius: 20px;
    background: linear-gradient(145deg, #f7faff, #eef4ff);
  }

  .map-copy {
    display: flex;
    padding: 18px 20px 4px;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .map-copy strong { color: #263b60; font-size: 15px; }
  .map-copy span { color: #7b8aa2; font-size: 11px; }

  .map-host {
    width: min(680px, 96%);
    margin: -16px auto -8px;
    aspect-ratio: 1;
  }

  .map-host :global(.geolonia-svg-map) { display: block; width: 100%; height: 100%; }
  .map-host :global(.prefecture) { fill: #dbe8fb !important; stroke: #ffffff !important; stroke-width: 1.6 !important; cursor: pointer; outline: none; transition: fill 130ms ease, filter 130ms ease; }
  .map-host :global(.prefecture:hover),
  .map-host :global(.prefecture:focus-visible) { fill: #769ee6 !important; filter: drop-shadow(0 4px 5px rgba(49, 93, 168, .22)); }
  .map-host :global(.prefecture.is-active) { fill: #4d73cc !important; }
  .map-host :global(.boundary-line) { stroke: #f7faff !important; }

  .attribution {
    margin: 0;
    padding: 0 16px 12px;
    color: #9aa5b6;
    text-align: right;
    font-size: 9px;
  }

  .attribution a { color: inherit; }

  @media (max-width: 640px) {
    .map-shell { border-radius: 16px; }
    .map-copy { padding: 15px 15px 0; }
    .map-host { width: 100%; margin-top: -6px; }
  }
</style>
