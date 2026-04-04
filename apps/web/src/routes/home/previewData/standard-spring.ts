import type { PreviewItinerary } from "./types";

export const standardSpringPreview: PreviewItinerary = {
  title: "桜見物の旅",
  themeId: "standard-spring",
  themeName: "標準（春）",
  description: "やさしく、かわいらしい",
  phrase: "春の旅行計画",
  layout: "timeline",
  colors: {
    primary: "#d946a6",
    secondary: "#ec4899",
    background: "#fdf2f8",
    text: "#831843",
    accent: "#f472b6",
    border: "#f5d5e8",
  },
  steps: [
    { time: "08:00", label: "京都駅出発", icon: "🚄" },
    { time: "11:00", label: "淀城址の桜", icon: "🌸" },
    { time: "15:00", label: "伏見稲荷参拝", icon: "⛩️" },
  ],
  features: ["タイムライン", "secret", "複数ビュー"],
};
