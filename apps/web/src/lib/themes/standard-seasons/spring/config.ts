import type { ThemeConfig } from "@tabitabi/types";

export const seasonSpringTheme: ThemeConfig = {
  id: "standard-spring",
  name: "標準（春）",
  version: "1.0.0",
  description: "春をモチーフにした温かみのあるテーマ",
  author: "Tabitabi Team",
  features: {
    steps: { enabled: true, required: true },
    memo: { enabled: true },
    checklist: { enabled: false },
    budget: { enabled: false },
    map: { enabled: false },
  },
  ui: {
    layout: "single",
    colorScheme: "light",
    customColors: {
      primary: "#d946a6",
      secondary: "#ec4899",
      background: "#fdf2f8",
      text: "#831843",
      accent: "#f472b6",
    },
  },
};
