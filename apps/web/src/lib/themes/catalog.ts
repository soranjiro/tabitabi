import type { ItineraryViewMode } from "@tabitabi/types";

export const defaultThemeId = "planning-draft" as const;
export const defaultPaletteId = "neutral" as const;

export const availableThemes = [
  "planning-draft", "map-only", "mapbox-journey", "standard-spring", "standard-accordion",
  "standard-summer", "standard-autumn", "standard-winter", "ai-generated",
  "shopping", "pixel-quest", "sauna-rally",
] as const;
export type AvailableTheme = (typeof availableThemes)[number];

export const paletteIds = ["sakura", "ocean", "autumn", "snow", "neutral"] as const;
export type PaletteId = (typeof paletteIds)[number];

export interface ThemePresetOption {
  id: string; name: string; description: string; phrase: string;
  viewMode: ItineraryViewMode | "accordion";
  defaultPaletteId: PaletteId;
  enabled: boolean;
}

export interface PaletteOption {
  id: PaletteId; name: string; description: string;
  colors: Record<string, string>;
}

const palette = (id: PaletteId, name: string, description: string, primary: string, primaryLight: string, secondary: string, accent: string, background: string, text: string, textLight: string, border: string): PaletteOption => ({
  id, name, description,
  colors: {
    "--theme-bg": background, "--theme-primary": primary,
    "--theme-primary-light": primaryLight, "--theme-secondary": secondary,
    "--theme-accent": accent, "--theme-text": text,
    "--theme-text-light": textLight, "--theme-card-bg": "#ffffff",
    "--theme-header-bg": "transparent", "--theme-border": border,
    "--theme-line-color": primary, "--theme-dot-bg": primary,
    "--theme-decoration-primary": primary, "--theme-decoration-secondary": secondary,
    "--theme-decoration-accent": accent, "--theme-decoration-opacity": "0.03",
  },
});

export const PALETTES: PaletteOption[] = [
  palette("sakura", "やさしい桜", "淡いピンク", "#e990a8", "#f2a9ba", "#f6c5d1", "#ef9eb2", "#fff7f9", "#4b3440", "#806672", "#f3dbe2"),
  palette("ocean", "涼やかブルー", "澄んだ青", "#4f82d8", "#74a2ea", "#91b9f4", "#5d94e6", "#f5f9ff", "#263b5c", "#61728e", "#d9e6fa"),
  palette("autumn", "温もりの秋", "落ち着いた赤茶", "#9f4b35", "#be6b48", "#d7a048", "#c87835", "#fbf6f1", "#3f302b", "#73625a", "#e2cec0"),
  palette("snow", "雪あかり", "静かなアイスブルー", "#6685b2", "#87a1c7", "#9bc3d2", "#79a8c2", "#f6f9fc", "#2f4058", "#6a788b", "#dce6ef"),
  palette("neutral", "シンプル", "控えめなニュートラル", "#596579", "#778398", "#a6afbd", "#7b8798", "#f8f8f6", "#30343b", "#747982", "#e1e2df"),
];

const THEME_CATALOG: ThemePresetOption[] = [
  { id: "planning-draft", name: "プランニング", description: "候補から日時を決める、計画中のためのテーマ", phrase: "まだ決まっていない旅の計画", viewMode: "list", defaultPaletteId: "neutral", enabled: true },
  { id: "map-only", name: "旅先マップ", description: "地図に候補をピンして、行き先を決めながら予定を作る", phrase: "地図で決める旅行計画", viewMode: "list", defaultPaletteId: "neutral", enabled: true },
  { id: "standard-spring", name: "日カード", description: "日付タブで切り替える、親しみやすいカード", phrase: "日ごとの旅行計画", viewMode: "dayCard", defaultPaletteId: "sakura", enabled: true },
  { id: "standard-accordion", name: "セクションカード", description: "旅程全体を見渡せるアコーディオン", phrase: "見渡せる旅行計画", viewMode: "accordion", defaultPaletteId: "ocean", enabled: true },
  { id: "standard-summer", name: "リスト", description: "予定をすっきり一覧表示", phrase: "一覧で見る旅行計画", viewMode: "list", defaultPaletteId: "ocean", enabled: true },
  { id: "standard-autumn", name: "週ビュー", description: "一週間の流れをまとめて表示", phrase: "週で見る旅行計画", viewMode: "week", defaultPaletteId: "autumn", enabled: true },
  { id: "standard-winter", name: "月ビュー", description: "月全体をカレンダーで表示", phrase: "月で見る旅行計画", viewMode: "month", defaultPaletteId: "snow", enabled: true },
  { id: "shopping", name: "買い物リスト", description: "買い物管理向け", phrase: "買い物プラン", viewMode: "list", defaultPaletteId: "neutral", enabled: false },
  { id: "pixel-quest", name: "ピクセルクエスト", description: "RPG風マップ表示", phrase: "RPGデザイン", viewMode: "list", defaultPaletteId: "neutral", enabled: false },
  { id: "mapbox-journey", name: "Mapbox Journey", description: "3D地図・グローブ表示", phrase: "Mapboxでの旅", viewMode: "list", defaultPaletteId: "neutral", enabled: false },
  { id: "ai-generated", name: "AI Generated", description: "purple", phrase: "AI生成デザイン", viewMode: "list", defaultPaletteId: "neutral", enabled: false },
  { id: "sauna-rally", name: "サウナスタンプラリー", description: "サウナ旅を記録", phrase: "サウナ巡り", viewMode: "list", defaultPaletteId: "neutral", enabled: false },
];

export function getAvailableThemes() { return THEME_CATALOG.filter((theme) => theme.enabled); }
export function getThemePreset(themeId: string) { return THEME_CATALOG.find((theme) => theme.id === themeId) ?? THEME_CATALOG[0]; }
export function getAvailablePalettes() { return PALETTES; }
export function getPalette(paletteId?: string) { return PALETTES.find((item) => item.id === paletteId) ?? PALETTES[0]; }
export function getThemePhrases() { return getAvailableThemes().map((theme) => theme.phrase); }
