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
    { time: "08:30", label: "東京駅から長野駅へ移動", icon: "🚄", dayOffset: 0, durationDays: 2 },
    { time: "09:00", label: "雪山リゾート滞在", icon: "🏔️", dayOffset: 1, durationDays: 4 },
    { time: "15:00", label: "4日間スキー合宿", icon: "🎿", dayOffset: 2, durationDays: 4 },
    { time: "21:00", label: "温泉宿にチェックイン", icon: "♨️", dayOffset: 6, durationDays: 3 },
    // { time: "09:30", label: "雪見カフェで休憩", icon: "☕", dayOffset: 7, durationDays: 1 },
  ],
  features: ["月ビュー", "雪景色", "複数日イベント"],
};
