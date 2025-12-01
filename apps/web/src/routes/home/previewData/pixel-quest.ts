import type { PreviewItinerary } from "./types";

export const pixelQuestPreview: PreviewItinerary = {
  title: "東京冒険",
  themeId: "pixel-quest",
  themeName: "ピクセルクエスト",
  description: "RPG風マップ",
  layout: "timeline",
  colors: {
    primary: "#5d8a4a",
    secondary: "#d4a853",
    background: "#2d1b0e",
    text: "#f4e8d3",
    accent: "#e85d3b",
    border: "#4a3828",
  },
  steps: [
    { time: "09:00", label: "秋葉原", icon: "⚔️" },
    { time: "12:00", label: "ラーメン屋", icon: "🍜" },
    { time: "15:00", label: "浅草寺", icon: "🏯" },
  ],
  features: ["ゲーム風UI", "EXP獲得"],
};
