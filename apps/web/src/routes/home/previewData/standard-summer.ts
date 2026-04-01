import type { PreviewItinerary } from "./types";

export const standardSummerPreview: PreviewItinerary = {
  title: "夏祭りめぐり",
  themeId: "standard-summer",
  themeName: "標準（夏）",
  description: "爽やかで涼しい",
  phrase: "夏の旅",
  layout: "timeline",
  colors: {
    primary: "#0369a1",
    secondary: "#0284c7",
    background: "#f0f9ff",
    text: "#082f49",
    accent: "#0ea5e9",
    border: "#bae6fd",
  },
  steps: [
    { time: "17:00", label: "祇園祭スタート", icon: "🏮" },
    { time: "19:00", label: "屋台グルメ", icon: "🍡" },
    { time: "21:00", label: "花火見物", icon: "🎆" },
  ],
  features: ["タイムライン", "地図表示", "イベント記録"],
};
