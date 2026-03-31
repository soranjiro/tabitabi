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
      primary: "#a93529",
      secondary: "#e6b422",
      background: "#fcf9f2",
      text: "#4a3b32",
      accent: "#d4762c",
    },
  },
};
