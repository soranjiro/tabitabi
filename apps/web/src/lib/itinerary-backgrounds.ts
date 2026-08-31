export const ITINERARY_BACKGROUND_PRESETS = [
  { id: 'sakura', name: '桜の旅', url: '/itinerary-backgrounds/sakura.avif' },
  { id: 'seaside', name: '海辺の旅', url: '/itinerary-backgrounds/seaside.avif' },
  { id: 'meadow', name: '草原の旅', url: '/itinerary-backgrounds/meadow.avif' },
  { id: 'sunset', name: '夕焼けの旅', url: '/itinerary-backgrounds/sunset.avif' },
  { id: 'snow', name: '雪景色の旅', url: '/itinerary-backgrounds/snow.avif' },
  { id: 'twilight', name: '夜空の旅', url: '/itinerary-backgrounds/twilight.avif' },
  { id: 'island', name: '島めぐり', url: '/itinerary-backgrounds/island.avif' },
  { id: 'mountain', name: '山の旅', url: '/itinerary-backgrounds/mountain.avif' },
  { id: 'lake', name: '湖畔の旅', url: '/itinerary-backgrounds/lake.avif' },
  { id: 'town', name: '街歩き', url: '/itinerary-backgrounds/town.avif' },
] as const;

export const ITINERARY_BACKGROUND_URLS = new Set(
  ITINERARY_BACKGROUND_PRESETS.map((preset) => preset.url),
);
