import type { ThemeConfig } from "@tabitabi/types";

export const seasonsTheme: ThemeConfig = {
  id: "standard-seasons",
  name: "スタンダード",
  version: "1.0.0",
  description: "四季をテーマにしたビュー",
  author: "Tabitabi Team",
  features: {
    steps: { enabled: true, required: true },
    memo: { enabled: true },
    checklist: { enabled: false },
    budget: { enabled: false },
    map: { enabled: false },
  },
  ui: {
    layout: "tabs",
    colorScheme: "light",
    customColors: {
      primary: "#3b82f6",
      secondary: "#60a5fa",
      background: "#f8fafc",
      text: "#1e293b",
      accent: "#0ea5e9",
    },
  },
};
