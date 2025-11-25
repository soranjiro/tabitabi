import type { PreviewItinerary } from "./types";

export const aiGeneratedPreview: PreviewItinerary = {
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
};
