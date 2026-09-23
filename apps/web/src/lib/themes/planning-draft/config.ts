import type { ThemeConfig } from "@tabitabi/types";

export const planningDraftTheme: ThemeConfig = {
  id: "planning-draft",
  name: "プランニング",
  version: "1.0.0",
  description: "候補を集め、地図で確認し、日程を決める",
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
