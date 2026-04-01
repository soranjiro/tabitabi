import type { PreviewItinerary } from "./types";

export const mapboxJourneyPreview: PreviewItinerary = {
  title: "世界夜景フライト",
  themeId: "mapbox-journey",
  themeName: "Mapbox Journey",
  description: "3Dグローブ",
  phrase: "Mapboxでの旅",
  layout: "card",
  colors: {
    primary: "#7c3aed",
    secondary: "#ec4899",
    background: "#0f172a",
    text: "#e2e8f0",
    accent: "#06b6d4",
    border: "#1f2937",
  },
  steps: [
    { time: "07:30", label: "羽田→台北", icon: "✈️" },
    { time: "11:30", label: "台北101展望台", icon: "🌏" },
    { time: "20:30", label: "シンガポール夜景", icon: "🌃" },
  ],
  features: ["3D地球", "アニメーション航路"],
};
