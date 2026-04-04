import type { PreviewItinerary } from "./types";

export const standardAutumnPreview: PreviewItinerary = {
  title: "京都紅葉旅行",
  themeId: "standard-autumn",
  themeName: "標準（秋）",
  description: "紅葉の週次予定",
  phrase: "秋の旅行計画",
  layout: "week",
  colors: {
    primary: "#a93529",
    secondary: "#e6b422",
    background: "#fcf9f2",
    text: "#4a3b32",
    accent: "#d4762c",
    border: "#e8e0d0",
  },
  steps: [
    { time: "09:00", label: "清水寺", icon: "⛩️", dayOffset: 1 },
    { time: "12:00", label: "祇園ランチ", icon: "🍱", dayOffset: 3 },
    { time: "15:00", label: "紅葉ライトアップ", icon: "🍁", dayOffset: 5 },
  ],
  features: ["週ビュー", "紅葉", "旅程"],
};
