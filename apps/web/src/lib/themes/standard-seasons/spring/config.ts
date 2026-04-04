import type { ThemeConfig } from "@tabitabi/types";

export const seasonSpringTheme: ThemeConfig = {
  id: "standard-spring",
  name: "標準（春）",
  version: "1.0.0",
  description: "桜をモチーフにした優しい薄ピンクのテーマ",
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
      primary: "#ec4899",
      secondary: "#f9a8d4",
      background: "#fff5f7",
      text: "#831843",
      accent: "#fbcfe8",
    },
  },
};
