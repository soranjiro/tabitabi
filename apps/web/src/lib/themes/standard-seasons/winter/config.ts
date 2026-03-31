import type { ThemeConfig } from "@tabitabi/types";

export const seasonWinterTheme: ThemeConfig = {
  id: "standard-winter",
  name: "標準（冬）",
  version: "1.0.0",
  description: "静寂と凛とした雰囲気の冬のテーマ",
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
      primary: "#1e40af",
      secondary: "#1e3a8a",
      background: "#f8fafc",
      text: "#0c2340",
      accent: "#3b82f6",
    },
  },
};
