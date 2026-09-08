import type { ThemeConfig } from "@tabitabi/types";

export const planningDraftTheme: ThemeConfig = {
  id: "planning-draft",
  name: "プラン",
  version: "1.0.0",
  description: "候補を日ごとに並べて予定を決める",
  author: "Tabitabi Team",
  features: {
    steps: { enabled: true, required: true },
    memo: { enabled: true },
  },
  ui: {
    layout: "single",
    colorScheme: "light",
    customColors: {
      primary: "#2f6657",
      secondary: "#dce9e3",
      accent: "#d88b58",
      background: "#faf9f5",
      text: "#26332f",
    },
  },
};
