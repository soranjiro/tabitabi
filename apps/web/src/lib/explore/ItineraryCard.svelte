<script lang="ts">
  import type { PublicItinerarySummary } from "./data";

  let {
    itinerary,
    compact = false,
  }: {
    itinerary: PublicItinerarySummary;
    compact?: boolean;
  } = $props();

  const toneMap = {
    coral: ["#ef8f7b", "#f8c9aa", "#fff0df"],
    ocean: ["#3b8791", "#9fd3d2", "#e9f5ec"],
    forest: ["#4f795f", "#a9c69c", "#f1f0d3"],
    sun: ["#d99336", "#f2c864", "#fff2c5"],
    lavender: ["#7b6ea8", "#c7bce0", "#f4eaf4"],
    ink: ["#375365", "#87aab3", "#e9eee8"],
  } as const;

  const tones = $derived(toneMap[itinerary.accent]);
  const cardStyle = $derived(`--tone-a:${tones[0]};--tone-b:${tones[1]};--tone-c:${tones[2]}`);
</script>

<article class:compact style={cardStyle}>
  <a class="visual" href="/itineraries/{itinerary.id}" aria-label="{itinerary.title}を読む">
    <span class="sun" aria-hidden="true"></span>
    <span class="hill hill-back" aria-hidden="true"></span>
    <span class="hill hill-front" aria-hidden="true"></span>
    <span class="stamp" aria-hidden="true">{itinerary.stamp}</span>
    <span class="duration">{itinerary.duration}</span>
  </a>

  <div class="body">
    <div class="prefectures">
      {#each itinerary.prefectures as prefecture, index}
        <a href="/area/{itinerary.prefectureSlugs[index]}">{prefecture}</a>
      {/each}
    </div>
    <a class="title-link" href="/itineraries/{itinerary.id}">
      <h3>{itinerary.title}</h3>
    </a>
    {#if !compact}
      <p class="description">{itinerary.description}</p>
    {/if}
    <div class="meta">
      <a class="author" href="/users/{itinerary.author}">
        <span>{itinerary.authorInitial}</span>
        @{itinerary.author}
      </a>
      <span class="stats">{itinerary.stops} spots · {itinerary.copies} copies</span>
    </div>
  </div>
</article>

<style>
  article {
    overflow: hidden;
    border: 1px solid #e8e7df;
    border-radius: 20px;
    background: white;
    box-shadow: 0 10px 34px rgba(36, 65, 62, 0.07);
    transition: 180ms ease;
  }

  article:hover {
    transform: translateY(-3px);
    box-shadow: 0 16px 40px rgba(36, 65, 62, 0.12);
  }

  .visual {
    position: relative;
    display: block;
    height: 180px;
    overflow: hidden;
    background: linear-gradient(155deg, var(--tone-c), var(--tone-b));
  }

  .sun {
    position: absolute;
    top: 26px;
    left: 28px;
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.7);
    box-shadow: 0 0 0 14px rgba(255, 255, 255, 0.14);
  }

  .hill {
    position: absolute;
    right: -12%;
    bottom: -54%;
    width: 92%;
    height: 112%;
    border-radius: 52% 48% 0 0;
    background: var(--tone-a);
    transform: rotate(-9deg);
  }

  .hill-back {
    right: 35%;
    bottom: -64%;
    background: rgba(255, 255, 255, 0.44);
    transform: rotate(13deg);
  }

  .stamp {
    position: absolute;
    right: 20px;
    top: 18px;
    display: grid;
    width: 52px;
    height: 52px;
    place-items: center;
    border: 2px solid rgba(255, 255, 255, 0.88);
    border-radius: 50%;
    color: white;
    background: color-mix(in srgb, var(--tone-a) 82%, transparent);
    font-family: serif;
    font-size: 23px;
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(35, 50, 50, 0.12);
  }

  .duration {
    position: absolute;
    left: 18px;
    bottom: 16px;
    padding: 6px 10px;
    border-radius: 999px;
    color: #28484a;
    background: rgba(255, 255, 255, 0.86);
    backdrop-filter: blur(8px);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  .body {
    padding: 18px 19px 17px;
  }

  .prefectures {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .prefectures a {
    color: #c55749;
    text-decoration: none;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.06em;
  }

  .title-link {
    color: inherit;
    text-decoration: none;
  }

  h3 {
    min-height: 2.9em;
    margin: 8px 0 7px;
    color: #203d3f;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.45;
    letter-spacing: 0.01em;
  }

  .description {
    min-height: 3.8em;
    margin: 0;
    color: #708081;
    font-size: 12px;
    line-height: 1.7;
  }

  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 16px;
    padding-top: 13px;
    border-top: 1px solid #f0efe9;
  }

  .author {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    overflow: hidden;
    color: #576b6d;
    text-decoration: none;
    font-size: 10px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .author span {
    display: grid;
    flex: none;
    width: 22px;
    height: 22px;
    place-items: center;
    border-radius: 50%;
    color: white;
    background: var(--tone-a);
    font-size: 9px;
  }

  .stats {
    color: #98a3a3;
    font-size: 9px;
    white-space: nowrap;
  }

  article.compact .visual {
    height: 140px;
  }

  article.compact h3 {
    min-height: 3.2em;
    font-size: 15px;
  }

  article.compact .body {
    padding: 15px;
  }

  @media (max-width: 520px) {
    .visual {
      height: 156px;
    }
  }
</style>
