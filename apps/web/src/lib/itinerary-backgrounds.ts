export const ITINERARY_BACKGROUND_PRESETS = [
  { id: 'home-spring', name: 'トップ画像・春', url: '/hero/background-spring.avif' },
  { id: 'home-summer', name: 'トップ画像・夏', url: '/hero/background-summer.avif' },
  { id: 'home-autumn', name: 'トップ画像・秋', url: '/hero/background-autumn.avif' },
  { id: 'home-winter', name: 'トップ画像・冬', url: '/hero/background-winter.avif' },
  { id: 'festival', name: 'お祭り', url: '/itinerary-backgrounds/festival.webp' },
  { id: 'camp', name: 'キャンプ', url: '/itinerary-backgrounds/camp.avif' },
  { id: 'starry-camp', name: '星空キャンプ', url: '/itinerary-backgrounds/starry-camp.avif' },
  { id: 'japanese', name: '和の旅', url: '/itinerary-backgrounds/japanese.avif' },
  { id: 'starry-sky', name: '星空', url: '/itinerary-backgrounds/starry-sky.avif' },
  { id: 'coastal-drive', name: '海岸ドライブ', url: '/itinerary-backgrounds/coastal-drive.avif' },
  { id: 'sea-turtle', name: '海亀', url: '/itinerary-backgrounds/sea-turtle.avif' },
  { id: 'hot-spring', name: '温泉', url: '/itinerary-backgrounds/hot-spring.avif' },
  { id: 'sky', name: '空の旅', url: '/itinerary-backgrounds/sky.avif' },
  { id: 'food', name: '食べ物の旅', url: '/itinerary-backgrounds/food.webp' },
] as const;

export const ITINERARY_BACKGROUND_URLS = new Set(
  ITINERARY_BACKGROUND_PRESETS.map((preset) => preset.url),
);
