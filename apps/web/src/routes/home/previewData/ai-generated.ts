import type { PreviewItinerary } from "./types";

export const aiGeneratedPreview: PreviewItinerary = {
  title: "沖縄旅行",
  themeId: "ai-generated",
  themeName: "AI Generated",
  description: "開発中",
  layout: "card",
  colors: {
    primary: "#c580d8ff",
    secondary: "#a855f7",
    background: "linear-gradient(135deg, #fdf2f8 0%, #faf5ff 50%, #f5f3ff 100%)",
    text: "#6c27a5ff",
    accent: "#f472b6",
    border: "#e9d5ff",
  },
  steps: [
    { time: "10:00", label: "那覇空港", icon: "✈️" },
    { time: "13:00", label: "ビーチ", icon: "🏖️" },
    { time: "19:00", label: "地元料理ディナー", icon: "🍣" },
  ],
  features: ["タイムライン", "開発中"],
};
