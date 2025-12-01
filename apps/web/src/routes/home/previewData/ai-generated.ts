import type { PreviewItinerary } from "./types";

export const aiGeneratedPreview: PreviewItinerary = {
  title: "沖縄旅行",
  themeId: "ai-generated",
  themeName: "AI Generated",
  description: "開発中",
  layout: "card",
  colors: {
    primary: "#0284c7",
    secondary: "#38bdf8",
    background: "#fafafa",
    text: "#18181b",
    accent: "#0ea5e9",
    border: "#e5e7eb",
  },
  steps: [
    { time: "10:00", label: "那覇空港", icon: "✈️" },
    { time: "13:00", label: "ビーチ", icon: "🏖️" },
    { time: "19:00", label: "地元料理ディナー", icon: "🍣" },
  ],
  features: ["タイムライン", "開発中"],
};
