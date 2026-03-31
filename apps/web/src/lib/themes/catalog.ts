export const defaultThemeId = "standard-autumn" as const;

export const availableThemes = [
  "map-only",
  "mapbox-journey",
  "standard-spring",
  "standard-summer",
  "standard-autumn",
  "standard-winter",
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
    id: "standard-spring",
    name: "標準（春）",
    description: "やさしく、かわいらしい",
    phrase: "春の旅",
  },
  {
    id: "standard-summer",
    name: "標準（夏）",
    description: "爽やかで涼しい",
    phrase: "夏の旅",
  },
  {
    id: "standard-autumn",
    name: "標準（秋）",
    description: "温かみがあり、落ち着いている",
    phrase: "秋の旅",
  },
  {
    id: "standard-winter",
    name: "標準（冬）",
    description: "静寂で、凛とした雰囲気",
    phrase: "冬の旅",
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
