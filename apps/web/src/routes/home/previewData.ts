export interface PreviewStep {
  time: string;
  label: string;
  icon: string;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  accent: string;
  border?: string;
}

export interface PreviewItinerary {
  title: string;
  themeId: string;
  themeName: string;
  description: string;
  layout: "list" | "timeline" | "card";
  colors: ThemeColors;
  steps: PreviewStep[];
  features: string[];
}

export const previewItineraries: PreviewItinerary[] = [
  {
    title: "週末おでかけ",
    themeId: "minimal",
    themeName: "ミニマル",
    description: "シンプル・軽量",
    layout: "list",
    colors: {
      primary: "#333333",
      secondary: "#888888",
      background: "#ffffff",
      text: "#333333",
      accent: "#333333",
      border: "#eeeeee",
    },
    steps: [
      { time: "10:00", label: "駅集合", icon: "" },
      { time: "11:30", label: "ランチ", icon: "" },
      { time: "14:00", label: "カフェ", icon: "" },
    ],
    features: ["タイムライン"],
  },
  {
    title: "京都紅葉旅行",
    themeId: "standard-autumn",
    themeName: "標準",
    description: "カルーセル表示",
    layout: "timeline",
    colors: {
      primary: "#a93529",
      secondary: "#e6b422",
      background: "#fcf9f2",
      text: "#4a3b32",
      accent: "#d4762c",
      border: "#e8e0d0",
    },
    steps: [
      { time: "09:00", label: "清水寺", icon: "⛩️" },
      { time: "12:00", label: "祇園ランチ", icon: "🍱" },
      { time: "15:00", label: "金閣寺", icon: "✨" },
      { time: "18:00", label: "夕食", icon: "🍜" },
    ],
    features: ["タイムライン", "secret機能", "walica連携"],
  },
  {
    title: "沖縄旅行",
    themeId: "ai-generated",
    themeName: "AI Generated",
    description: "フル機能",
    layout: "card",
    colors: {
      primary: "#0ea5e9",
      secondary: "#64748b",
      background: "#f8fafc",
      text: "#0f172a",
      accent: "#f59e0b",
      border: "#e2e8f0",
    },
    steps: [
      { time: "10:00", label: "那覇空港", icon: "✈️" },
      { time: "13:00", label: "ビーチ", icon: "🏖️" },
      { time: "18:00", label: "ディナー", icon: "🍽️" },
    ],
    features: ["タイムライン", "チェックリスト", "予算", "メモ", "マップ"],
  },
];
