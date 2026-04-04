import type { PreviewItinerary } from "./types";

export const standardWinterPreview: PreviewItinerary = {
  title: "雪の北海道",
  themeId: "standard-winter",
  themeName: "標準（冬）",
  description: "2週間で凛とした雪の旅",
  phrase: "冬の旅行計画",
  layout: "month",
  colors: {
    primary: "#2563eb",
    secondary: "#06b6d4",
    background: "#f0f8ff",
    text: "#1e3a8a",
    accent: "#0ea5e9",
    border: "#bfdbfe",
  },
  steps: [
    { time: "09:00", label: "新千歳空港着", icon: "🛫", dayOffset: 3 },
    { time: "12:00", label: "支笏湖展望", icon: "❄️", dayOffset: 5, durationDays: 3 },
    { time: "17:00", label: "温泉でリラックス", icon: "♨️", dayOffset: 10, durationDays: 2 },
  ],
  features: ["月ビュー", "雪景色", "複数日イベント"],
};
