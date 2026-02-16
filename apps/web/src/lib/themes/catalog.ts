export const defaultThemeId = "standard-autumn" as const;

export const availableThemes = [
  "map-only",
  "mapbox-journey",
  "standard-autumn",
  "ai-generated",
  "shopping",
  "pixel-quest",
  "sauna-rally",
] as const;

export type AvailableTheme = (typeof availableThemes)[number];

const THEME_CATALOG: Array<{
  id: AvailableTheme;
  name: string;
  description: string;
  phrase: string;
}> = [
  {
    id: "standard-autumn",
    name: "標準",
    description: "モチーフ秋",
    phrase: "旅行のしおり",
  },
  {
    id: "shopping",
    name: "買い物リスト",
    description: "買い物管理向け",
    phrase: "買い物プラン",
  },
  {
    id: "pixel-quest",
    name: "ピクセルクエスト",
    description: "RPG風マップ表示",
    phrase: "RPGデザイン",
  },
  {
    id: "map-only",
    name: "Map Only",
    description: "地図のみを表示",
    phrase: "地図での計画",
  },
  {
    id: "mapbox-journey",
    name: "Mapbox Journey",
    description: "3D地図・グローブ表示",
    phrase: "Mapboxでの旅",
  },
  {
    id: "ai-generated",
    name: "AI Generated",
    description: "purple",
    phrase: "AI生成デザイン",
  },
  {
    id: "sauna-rally",
    name: "サウナスタンプラリー",
    description: "サウナ旅を記録",
    phrase: "サウナ巡り",
  },
];

export function getAvailableThemes(): Array<{
  id: string;
  name: string;
  description: string;
}> {
  return THEME_CATALOG;
}

export function getThemePhrases(): string[] {
  return THEME_CATALOG.map((theme) => theme.phrase);
}
