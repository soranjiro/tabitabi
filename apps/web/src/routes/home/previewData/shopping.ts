import type { PreviewItinerary } from "./types";

export const shoppingPreview: PreviewItinerary = {
  title: "週末の買い物",
  themeId: "shopping",
  themeName: "買い物リスト",
  description: "お使い管理",
  layout: "list",
  colors: {
    primary: "#10b981",
    secondary: "#f59e0b",
    background: "#f0fdf4",
    text: "#1f2937",
    accent: "#06b6d4",
    border: "#d1fae5",
  },
  steps: [
    { time: "", label: "牛乳", icon: "", location: "スーパー" },
    { time: "", label: "パン", icon: "", location: "スーパー" },
    { time: "", label: "シャンプー", icon: "", location: "ドラッグストア" },
  ],
  features: ["チェックリスト", "店舗管理"],
};
