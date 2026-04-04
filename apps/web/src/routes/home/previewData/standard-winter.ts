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
    { time: "08:30", label: "東京駅から長野駅へ移動", icon: "🚄", dayOffset: 0, durationDays: 1 },
    { time: "11:30", label: "長野駅から白馬へバス移動", icon: "🚌", dayOffset: 0, durationDays: 1 },
    { time: "13:30", label: "スキー用具レンタル", icon: "🎿", dayOffset: 1, durationDays: 1 },
    { time: "14:45", label: "スキー初心者レッスン", icon: "⛷️", dayOffset: 1, durationDays: 1 },
    { time: "19:30", label: "地元居酒屋で夕食", icon: "🍶", dayOffset: 1, durationDays: 1 },
    { time: "21:00", label: "温泉宿にチェックイン", icon: "♨️", dayOffset: 1, durationDays: 2 },
    { time: "09:30", label: "雪見カフェで休憩", icon: "☕", dayOffset: 3, durationDays: 1 },
  ],
  features: ["月ビュー", "雪景色", "複数日イベント"],
};
