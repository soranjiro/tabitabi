import type { ThemeConfig } from "@tabitabi/types";

export const seasonSummerTheme: ThemeConfig = {
  id: "standard-summer",
  name: "標準（夏）",
  version: "1.0.0",
  description: "爽やかで涼しい夏のテーマ",
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
      primary: "#0369a1",
      secondary: "#0284c7",
      background: "#f0f9ff",
      text: "#082f49",
      accent: "#0ea5e9",
    },
  },
};
