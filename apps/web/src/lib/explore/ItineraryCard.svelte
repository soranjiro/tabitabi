<script lang="ts">
  import type { PublicFeedItem } from "@tabitabi/types";
  import { prefectureName } from "./data";

  let { itinerary, compact = false }: { itinerary: PublicFeedItem; compact?: boolean } = $props();

  const themeColors = {
    "standard-spring": ["#f8bfd0", "#fff4f7"],
    "standard-summer": ["#74b8e8", "#eff8ff"],
    "standard-autumn": ["#d6a363", "#fff8ed"],
    "standard-winter": ["#8fa8d6", "#f2f5ff"],
  } as const;

  const colors = $derived(themeColors[itinerary.theme_id as keyof typeof themeColors] ?? themeColors["standard-autumn"]);
  const duration = $derived.by(() => {
    if (itinerary.start_at == null || itinerary.end_at == null) return "日程未設定";
    const start = new Date(itinerary.start_at);
    const end = new Date(itinerary.end_at);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1);
    return days === 1 ? "日帰り" : `${days - 1}泊${days}日`;
  });
</script>

<article style={`--accent:${colors[0]};--soft:${colors[1]}`}>
  <a class="card-link" href="/itineraries/{itinerary.itinerary_id}" aria-label="{itinerary.title}を読む">
    <div class="theme-strip"><span>{duration}</span></div>
    <div class="body">
      <div class="destinations">
        {#each itinerary.prefecture_slugs as slug, index}
          <span>{prefectureName(slug)}</span>{#if index < itinerary.prefecture_slugs.length - 1}<i>・</i>{/if}
        {/each}
      </div>
      <h3>{itinerary.title}</h3>
      {#if !compact && itinerary.description}<p class="description">{itinerary.description}</p>{/if}
      <div class="chips">
        {#each itinerary.areas.slice(0, 2) as area}<span>{area}</span>{/each}
        {#each itinerary.tags.slice(0, compact ? 1 : 2) as tag}<span>#{tag}</span>{/each}
      </div>
      <div class="meta">
        <span class="author"><i>{itinerary.username.slice(0, 1).toUpperCase()}</i> @{itinerary.username}</span>
        <span>{itinerary.stops}件の予定 · {itinerary.copies}コピー</span>
      </div>
    </div>
  </a>
</article>

<style>
  article {
    overflow: hidden;
    border: 1px solid #e4eaf4;
    border-radius: 16px;
    background: white;
    box-shadow: 0 8px 28px rgba(51, 77, 123, 0.06);
    transition: transform 160ms ease, box-shadow 160ms ease;
  }

  article:hover {
    transform: translateY(-2px);
    box-shadow: 0 13px 32px rgba(51, 77, 123, 0.1);
  }

  .card-link { color: inherit; text-decoration: none; }

  .theme-strip {
    display: flex;
    height: 58px;
    padding: 12px;
    align-items: flex-end;
    justify-content: flex-end;
    background:
      radial-gradient(circle at 15% 20%, rgba(255,255,255,.75) 0 8px, transparent 9px),
      linear-gradient(135deg, var(--soft), color-mix(in srgb, var(--accent) 55%, white));
  }

  .theme-strip span {
    padding: 4px 8px;
    border-radius: 999px;
    color: #45546b;
    background: rgba(255,255,255,.84);
    font-size: 10px;
    font-weight: 800;
  }

  .body { padding: 16px; }
  .destinations { color: #4c72bc; font-size: 11px; font-weight: 800; }
  .destinations i { font-style: normal; color: #aab4c5; }

  h3 {
    min-height: 2.9em;
    margin: 7px 0 6px;
    color: #24344f;
    font-size: 16px;
    line-height: 1.45;
  }

  .description {
    min-height: 3.3em;
    margin: 0 0 12px;
    color: #6b778c;
    font-size: 12px;
    line-height: 1.65;
  }

  .chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
  .chips span { padding: 4px 7px; border-radius: 6px; color: #60708a; background: #f5f7fb; font-size: 10px; }

  .meta {
    display: flex;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #eef1f6;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    color: #8a95a7;
    font-size: 10px;
  }

  .author { display: inline-flex; align-items: center; gap: 5px; }
  .author i { display: grid; width: 20px; height: 20px; place-items: center; border-radius: 50%; color: #4c72bc; background: #eef4ff; font-style: normal; font-weight: 900; }

  @media (max-width: 420px) {
    .body { padding: 14px; }
    .meta { align-items: flex-start; flex-direction: column; }
  }
</style>
