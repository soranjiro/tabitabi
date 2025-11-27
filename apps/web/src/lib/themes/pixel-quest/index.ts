import type { Theme } from "@tabitabi/types";
import ItineraryView from "./ItineraryView.svelte";
import StepList from "./StepList.svelte";

const pixelQuestTheme: Theme = {
  id: "pixel-quest",
  name: "ピクセルクエスト",
  version: "1.0.0",
  description: "レトロRPG風マップで旅程を冒険として表示",
  author: "Tabitabi Team",
  features: {
    steps: {
      enabled: true,
      required: true,
    },
    memo: {
      enabled: true,
    },
  },
  ui: {
    layout: "single",
    colorScheme: "light",
    customColors: {
      primary: "#5d8a4a",
      secondary: "#d4a853",
      accent: "#e85d3b",
      background: "#2d1b0e",
      text: "#f4e8d3",
    },
  },
  components: {
    ItineraryView,
    StepList,
  },
};

export default pixelQuestTheme;
