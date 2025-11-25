import type { PreviewItinerary } from "./types";

export const minimalPreview: PreviewItinerary = {
  title: "週末おでかけ",
  themeId: "minimal",
  themeName: "ミニマル",
  description: "シンプル・軽量",
  layout: "list",
  colors: {
    primary: "#565656ff",
    secondary: "#888888",
    background: "#ffffff",
    text: "#333333",
    accent: "#333333",
    border: "#eeeeee",
  },
  steps: [
    { time: "10:00", label: "駅集合", icon: "" },
    { time: "11:30", label: "ランチ", icon: "" },
    { time: "14:00", label: "カフェ", icon: "" },
  ],
  features: ["タイムライン"],
};
