import type { AvailableTheme } from '$lib/themes/catalog';
import { defaultThemeId } from '$lib/themes/catalog';
import type { DemoDataSet } from '../themes/types';

type DemoDataLoader = () => Promise<{ getDemoData: () => DemoDataSet }>;

const demoDataLoaders: Record<AvailableTheme, DemoDataLoader> = {
  'map-only': () => import('$lib/themes/map-only/demo-data'),
  'mapbox-journey': () => import('$lib/themes/mapbox-journey/demo-data'),
  'standard-spring': () => import('$lib/themes/standard-seasons/spring/demo-data'),
  'standard-summer': () => import('$lib/themes/standard-seasons/summer/demo-data'),
  'standard-autumn': () => import('$lib/themes/standard-seasons/autumn/demo-data'),
  'standard-winter': () => import('$lib/themes/standard-seasons/winter/demo-data'),
  'ai-generated': () => import('$lib/themes/ai-generated/demo-data'),
  'shopping': () => import('$lib/themes/shopping/demo-data'),
  'pixel-quest': () => import('$lib/themes/pixel-quest/demo-data'),
  'sauna-rally': () => import('$lib/themes/sauna-rally/demo-data'),
};

const demoDataCache = new Map<AvailableTheme, DemoDataSet>();

export async function getDemoData(themeId: string): Promise<DemoDataSet> {
  const theme = themeId as AvailableTheme;

  if (demoDataCache.has(theme)) {
    return demoDataCache.get(theme)!;
  }

  const loader = demoDataLoaders[theme];

  if (!loader) {
    const defaultLoader = demoDataLoaders[defaultThemeId];
    const module = await defaultLoader();
    const data = module.getDemoData();
    demoDataCache.set(defaultThemeId, data);
    return data;
  }

  try {
    const module = await loader();
    const data = module.getDemoData();
    demoDataCache.set(theme, data);
    return data;
  } catch (error) {
    console.error(`Failed to load demo data for theme ${themeId}:`, error);
    const defaultLoader = demoDataLoaders[defaultThemeId];
    const module = await defaultLoader();
    const data = module.getDemoData();
    demoDataCache.set(defaultThemeId, data);
    return data;
  }
}
