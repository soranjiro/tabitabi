import type { ThemeConfig } from "@tabitabi/types";

export const planningDraftTheme: ThemeConfig = {
  id: "planning-draft",
  name: "プランニング",
  version: "1.0.0",
  description: "候補から日、時間の順に予定を決めるためのシンプルなテーマ",
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
