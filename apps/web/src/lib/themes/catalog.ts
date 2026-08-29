export const defaultThemeId = "standard-spring" as const;

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
  enabled: boolean;
}> = [
  {
    id: "standard-spring",
    name: "標準（春）",
    description: "やさしく、かわいらしい",
    phrase: "春の旅行計画",
    enabled: true,
  },
  {
    id: "standard-summer",
    name: "標準（夏）",
    description: "爽やかで涼しい",
    phrase: "夏の旅行計画",
    enabled: true,
  },
  {
    id: "standard-autumn",
    name: "標準（秋）",
    description: "温かみがあり、落ち着いている",
    phrase: "秋の旅行計画",
    enabled: true,
  },
  {
    id: "standard-winter",
    name: "標準（冬）",
    description: "静寂で、凛とした雰囲気",
    phrase: "冬の旅行計画",
    enabled: true,
  },
  {
    id: "shopping",
    name: "買い物リスト",
    description: "買い物管理向け",
    phrase: "買い物プラン",
    enabled: false,
  },
  {
    id: "pixel-quest",
    name: "ピクセルクエスト",
    description: "RPG風マップ表示",
    phrase: "RPGデザイン",
    enabled: false,
  },
  {
    id: "map-only",
    name: "Map Only",
    description: "地図のみを表示",
    phrase: "地図での計画",
    enabled: false,
  },
  {
    id: "mapbox-journey",
    name: "Mapbox Journey",
    description: "3D地図・グローブ表示",
    phrase: "Mapboxでの旅",
    enabled: false,
  },
  {
    id: "ai-generated",
    name: "AI Generated",
    description: "purple",
    phrase: "AI生成デザイン",
    enabled: false,
  },
  {
    id: "sauna-rally",
    name: "サウナスタンプラリー",
    description: "サウナ旅を記録",
    phrase: "サウナ巡り",
    enabled: false,
  },
];

export function getAvailableThemes(): Array<{
  id: string;
  name: string;
  description: string;
}> {
  return THEME_CATALOG.filter((theme) => theme.enabled);
}

export function getThemePhrases(): string[] {
  return THEME_CATALOG.filter((theme) => theme.enabled).map((theme) => theme.phrase);
}
