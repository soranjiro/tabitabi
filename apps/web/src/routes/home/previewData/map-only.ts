import type { PreviewItinerary } from "./types";

export const mapOnlyPreview: PreviewItinerary = {
  title: "東京シティマップ",
  themeId: "map-only",
  themeName: "Map Only",
  description: "地図に集中",
  layout: "timeline",
  colors: {
    primary: "#111827",
    secondary: "#6b7280",
    background: "#f6f7fb",
    text: "#111827",
    accent: "#2563eb",
    border: "#e5e7eb",
  },
  steps: [
    { time: "09:00", label: "浅草寺", icon: "📍" },
    { time: "12:30", label: "スカイツリー", icon: "🗼" },
    { time: "18:00", label: "渋谷交差点", icon: "🌆" },
  ],
  features: ["地図ビュー", "シンプルUI"],
};
