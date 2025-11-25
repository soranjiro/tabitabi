import type { PreviewItinerary } from "./types";

export const standardAutumnPreview: PreviewItinerary = {
  title: "京都紅葉旅行",
  themeId: "standard-autumn",
  themeName: "標準",
  description: "多機能",
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
    { time: "15:00", label: "★★ Secret ★★", icon: "🔒" },
  ],
  features: ["日カード", "secret機能", "walica連携"],
};
