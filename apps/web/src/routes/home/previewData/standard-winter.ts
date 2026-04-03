import type { PreviewItinerary } from "./types";

export const standardWinterPreview: PreviewItinerary = {
  title: "雪の北海道",
  themeId: "standard-winter",
  themeName: "標準（冬）",
  description: "静寂で、凛とした雰囲気",
  phrase: "冬の旅行計画",
  layout: "timeline",
  colors: {
    primary: "#2563eb",
    secondary: "#06b6d4",
    background: "#f0f8ff",
    text: "#1e3a8a",
    accent: "#0ea5e9",
    border: "#bfdbfe",
  },
  steps: [
    { time: "09:00", label: "新千歳空港着", icon: "🛫" },
    { time: "12:00", label: "支笏湖展望", icon: "❄️" },
    { time: "17:00", label: "温泉でリラックス", icon: "♨️" },
  ],
  features: ["タイムライン", "温泉ガイド", "撮影スポット"],
};
