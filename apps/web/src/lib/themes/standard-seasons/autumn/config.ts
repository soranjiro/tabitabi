import type { ThemeConfig } from "@tabitabi/types";

export const seasonAutumnTheme: ThemeConfig = {
  id: "standard-autumn",
  name: "標準（秋）",
  version: "1.0.0",
  description: "温かみと落ち着きのある秋のテーマ",
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
      primary: "#8b2e1f",
      secondary: "#d89f2e",
      background: "#faf5f0",
      text: "#3a2d25",
      accent: "#c46b1f",
    },
  },
};
