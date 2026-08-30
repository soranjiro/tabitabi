import type { ThemeConfig } from "@tabitabi/types";
export const accordionTheme: ThemeConfig = {
  id: "standard-accordion", name: "セクションカード", version: "1.0.0",
  description: "複数日の予定を見渡せるアコーディオンテーマ", author: "Tabitabi Team",
  features: { steps: { enabled: true, required: true }, memo: { enabled: true } },
  ui: { layout: "accordion", colorScheme: "light", customColors: { primary: "#4f82d8", secondary: "#91b9f4", accent: "#5d94e6", background: "#f5f9ff", text: "#263b5c" } },
};
